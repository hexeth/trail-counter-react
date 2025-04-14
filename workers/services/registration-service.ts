import type { RegistrationData } from '../durable-objects/registration';
import { TrailManagerDO } from '../durable-objects/trail-manager';

/**
 * Interface for trail registration mapping
 */
interface TrailRegistrationMap {
  registrationIds: string[];
}

/**
 * Service to handle all registration-related operations
 */
export class RegistrationService {
  state: DurableObjectState;
  env: Env;
  manager: TrailManagerDO;
  
  constructor(state: DurableObjectState, env: Env, manager: TrailManagerDO) {
    this.state = state;
    this.env = env;
    this.manager = manager;
  }
  
  async handleRequest(request: Request, path: string): Promise<Response> {
    // Create a new registration via public endpoint
    if (path === '/public/registrations' && request.method === 'POST') {
      const data = await request.json() as Partial<RegistrationData>;
      return await this.createRegistration(data);
    }
    
    // Create a new registration
    if (path === '/registrations' && request.method === 'POST') {
      const data = await request.json() as Partial<RegistrationData>;
      return await this.createRegistration(data);
    }
    
    // Get all registrations
    if (path === '/registrations' && request.method === 'GET') {
      return await this.getAllRegistrations();
    }
    
    // New endpoint to flush all registrations
    if (path === '/registrations/flush-all' && request.method === 'DELETE') {
      return await this.flushAllRegistrations();
    }
    
    // Operations on a specific registration
    const registrationId = this.getIdFromPath(path);
    if (!registrationId) {
      return new Response('Registration ID required', { status: 400 });
    }
    
    // Get specific registration
    if (path === `/registrations/${registrationId}` && request.method === 'GET') {
      return await this.getRegistration(registrationId);
    }
    
    // Update specific registration
    if (path === `/registrations/${registrationId}` && request.method === 'PUT') {
      const data = await request.json() as Partial<RegistrationData>;
      return await this.updateRegistration(registrationId, data);
    }
    
    // Delete specific registration
    if (path === `/registrations/${registrationId}` && request.method === 'DELETE') {
      return await this.deleteRegistration(registrationId);
    }
    
    return new Response('Not found', { status: 404 });
  }
  
  // Utility to extract ID from URL path
  private getIdFromPath(path: string): string | null {
    const parts = path.split('/');
    return parts.length > 2 ? parts[2] : null;
  }
  
  async getAllRegistrations(): Promise<Response> {
    // Try to get from cache first
    const cacheKey = 'all-registrations';
    const cachedRegistrations = this.manager.getFromCache<RegistrationData[]>(cacheKey);
    
    if (cachedRegistrations) {
      console.log('[RegistrationService] Returning cached registrations data');
      return new Response(JSON.stringify(cachedRegistrations), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('[RegistrationService] Cache miss for registrations data, fetching from storage');
    
    // Get all registration IDs stored in the manager
    const registrationIds = await this.state.storage.list<string>({ prefix: 'registration:' });
    
    // Fetch each registration's data from its Durable Object
    const registrations: RegistrationData[] = [];
    
    // Process in batches to avoid memory issues with large datasets
    const batchSize = 50;
    const batches = [];
    
    let currentBatch: [string, string][] = [];
    for (const entry of registrationIds) {
      currentBatch.push(entry);
      if (currentBatch.length >= batchSize) {
        batches.push([...currentBatch]);
        currentBatch = [];
      }
    }
    
    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }
    
    // Process each batch
    for (const batch of batches) {
      const batchPromises = batch.map(async ([key, id]) => {
        try {
          const registrationId = key.substring(13); // Remove 'registration:' prefix
          
          // Safely get the Durable Object - wrap in try/catch to handle invalid IDs
          let registrationDO;
          try {
            registrationDO = this.env.REGISTRATION_DO.get(
              this.env.REGISTRATION_DO.idFromString(id)
            );
          } catch (error) {
            console.error(`Invalid Durable Object ID for registration ${registrationId}: ${id}`);
            return null; // Skip this registration and continue with others
          }
          
          const response = await registrationDO.fetch('https://dummy-url/');
          if (response.status === 200) {
            return await response.json() as RegistrationData;
          }
        } catch (error) {
          console.error(`Error fetching registration for key ${key}:`, error);
        }
        return null;
      });
      
      // Wait for the batch to complete
      const batchResults = await Promise.all(batchPromises);
      registrations.push(...batchResults.filter(reg => reg !== null) as RegistrationData[]);
    }
    
    // Cache the results
    this.manager.setInCache(cacheKey, registrations, 60 * 1000); // 1 minute TTL
    
    return new Response(JSON.stringify(registrations), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  async createRegistration(data: Partial<RegistrationData>): Promise<Response> {
    // Ensure we have a trail ID
    if (!data.trailId) {
      return new Response('Trail ID is required', { status: 400 });
    }
    
    try {
      // Check if the trail exists
      const trailObjectId = await this.state.storage.get<string>(`trail:${data.trailId}`);
      if (!trailObjectId) {
        return new Response('Trail not found', { status: 404 });
      }
      
      // Generate a unique ID for the new registration
      const registrationId = crypto.randomUUID();
      
      // Create a new Durable Object for this registration
      const registrationObjectId = this.env.REGISTRATION_DO.newUniqueId();
      const registrationObject = this.env.REGISTRATION_DO.get(registrationObjectId);
      
      // Set the ID in the registration data
      data.id = registrationId;
      
      // Initialize the registration data in the Durable Object
      const response = await registrationObject.fetch('https://dummy-url/', {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      
      if (response.status === 200) {
        // Perform storage operations in parallel to improve performance
        await Promise.all([
          // Store the mapping between registration ID and Durable Object ID
          this.state.storage.put(`registration:${registrationId}`, registrationObjectId.toString()),
          
          // Update the trail registrations map
          this.updateTrailRegistrationsMap(data.trailId, registrationId)
        ]);
        
        // Debounce cache invalidation to reduce overhead during bulk operations
        this.debounceInvalidateCache(data.trailId);
      }
      
      return response;
    } catch (error) {
      console.error('Error creating registration:', error);
      return new Response(`Error creating registration: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        { status: 500 });
    }
  }
  
  // Helper to update the trail registrations map
  private async updateTrailRegistrationsMap(trailId: string, registrationId: string): Promise<void> {
    // Get existing registrations for this trail
    let trailRegistrations = await this.state.storage.get<TrailRegistrationMap>(`trail_registrations:${trailId}`);
    
    if (!trailRegistrations) {
      trailRegistrations = { registrationIds: [] };
    }
    
    // Add this registration to the list
    trailRegistrations.registrationIds.push(registrationId);
    
    // Store the updated map
    await this.state.storage.put(`trail_registrations:${trailId}`, trailRegistrations);
  }
  
  // Cache invalidation timers
  private cacheInvalidationTimers: Record<string, number> = {};
  
  // Debounce cache invalidation to prevent excessive cache invalidation during bulk operations
  private debounceInvalidateCache(trailId: string | null): void {
    // Clear existing timer for this trail
    if (this.cacheInvalidationTimers[trailId || 'global']) {
      clearTimeout(this.cacheInvalidationTimers[trailId || 'global']);
    }
    
    // Set a new timer - only invalidate after 2 seconds of inactivity
    this.cacheInvalidationTimers[trailId || 'global'] = setTimeout(() => {
      this.invalidateAllCaches(trailId);
      delete this.cacheInvalidationTimers[trailId || 'global'];
    }, 2000) as unknown as number;
  }
  
  async getRegistration(registrationId: string): Promise<Response> {
    // Check cache first
    const cacheKey = `registration:${registrationId}`;
    const cachedRegistration = this.manager.getFromCache<RegistrationData>(cacheKey);
    
    if (cachedRegistration) {
      console.log(`[RegistrationService] Returning cached registration: ${registrationId}`);
      return new Response(JSON.stringify(cachedRegistration), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Get the Durable Object ID for this registration
    const registrationObjectId = await this.state.storage.get<string>(
      `registration:${registrationId}`
    );
    
    if (!registrationObjectId) {
      return new Response('Registration not found', { status: 404 });
    }
    
    // Get the registration data from its Durable Object
    const registrationObject = this.env.REGISTRATION_DO.get(
      this.env.REGISTRATION_DO.idFromString(registrationObjectId)
    );
    
    const response = await registrationObject.fetch('https://dummy-url/');
    
    if (response.status === 200) {
      const data = await response.json();
      // Cache the result
      this.manager.setInCache(cacheKey, data, 5 * 60 * 1000); // 5 minute TTL
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return response;
  }
  
  async updateRegistration(registrationId: string, data: Partial<RegistrationData>): Promise<Response> {
    // Get the Durable Object ID for this registration
    const registrationObjectId = await this.state.storage.get<string>(
      `registration:${registrationId}`
    );
    
    if (!registrationObjectId) {
      return new Response('Registration not found', { status: 404 });
    }
    
    // Get original data to check if trail ID changed and to calculate horse count difference
    const registrationObject = this.env.REGISTRATION_DO.get(
      this.env.REGISTRATION_DO.idFromString(registrationObjectId)
    );
    
    const originalResponse = await registrationObject.fetch('https://dummy-url/');
    let originalData: RegistrationData | null = null;
    
    if (originalResponse.status === 200) {
      originalData = await originalResponse.json() as RegistrationData;
    }
    
    // Update the registration data in its Durable Object
    const response = await registrationObject.fetch('https://dummy-url/', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    
    // Invalidate caches on successful update
    if (response.status === 200) {
      // Invalidate original trail caches
      if (originalData && originalData.trailId) {
        this.invalidateAllCaches(originalData.trailId);
      }
      
      // If trail changed, invalidate new trail caches too
      if (data.trailId && originalData && data.trailId !== originalData.trailId) {
        this.invalidateAllCaches(data.trailId);
      }
    }
    
    return response;
  }
  
  async deleteRegistration(registrationId: string): Promise<Response> {
    // Get the Durable Object ID for this registration
    const registrationObjectId = await this.state.storage.get<string>(
      `registration:${registrationId}`
    );
    
    if (!registrationObjectId) {
      return new Response('Registration not found', { status: 404 });
    }
    
    // Get the registration data to find its trail ID
    const registrationObject = this.env.REGISTRATION_DO.get(
      this.env.REGISTRATION_DO.idFromString(registrationObjectId)
    );
    
    const response = await registrationObject.fetch('https://dummy-url/');
    let trailId: string | null = null;
    
    if (response.status === 200) {
      const data = await response.json() as RegistrationData;
      trailId = data.trailId;
      
      // NEW APPROACH: Remove the registration from the trail's registration map
      if (trailId) {
        const trailRegistrations = await this.state.storage.get<TrailRegistrationMap>(`trail_registrations:${trailId}`);
        
        if (trailRegistrations) {
          // Filter out this registration
          trailRegistrations.registrationIds = trailRegistrations.registrationIds.filter(
            id => id !== registrationId
          );
          
          // Store the updated map
          await this.state.storage.put(`trail_registrations:${trailId}`, trailRegistrations);
        }
      }
    }
    
    // Delete the registration from global index
    await this.state.storage.delete(`registration:${registrationId}`);
    
    // Delete the registration in its Durable Object
    const deleteResponse = await registrationObject.fetch('https://dummy-url/', {
      method: 'DELETE'
    });
    
    // Invalidate caches on successful deletion
    if (deleteResponse.status === 200 && trailId) {
      this.invalidateAllCaches(trailId);
    }
    
    return deleteResponse;
  }
  
  // Helper method to invalidate all caches that might be affected by a registration change
  private invalidateAllCaches(trailId: string | null): void {
    console.log(`[RegistrationService] Invalidating all caches for trail: ${trailId}`);
    
    // Invalidate registration-specific caches
    this.manager.invalidateCache('all-registrations');
    
    // Invalidate statistics caches
    this.manager.invalidateCache('summary-statistics');
    this.manager.invalidateCache('registrations:'); // This prefix will match all paginated registration data
    this.manager.invalidateCache('analytics-data'); // Invalidate analytics cache
    
    // Invalidate trail-related caches
    this.manager.invalidateCache('all-trails');
    this.manager.invalidateCache('trails-name-map');
    
    // Invalidate specific trail caches if we have a trail ID
    if (trailId) {
      this.manager.invalidateCache(`trail-reg-count:${trailId}`);
      this.manager.invalidateCache(`trail-horse-count:${trailId}`);
      this.manager.invalidateCache(`trail:${trailId}`);
    }
    
    // Trigger analytics aggregation
    this.triggerAnalyticsAggregation();
  }
  
  /**
   * Triggers analytics data aggregation
   * This is done in an async way without awaiting to avoid slowing down CRUD operations
   */
  private triggerAnalyticsAggregation(): void {
    // Using setTimeout to defer execution and not await the result
    setTimeout(async () => {
      try {
        // Direct method call instead of fetch to avoid DNS lookup failures
        // This is more reliable in the Miniflare environment
        if (this.manager) {
          try {
            // Try to call the manager's method directly instead of using fetch
            const statisticsService = this.manager.getStatisticsService();
            if (statisticsService) {
              await statisticsService.aggregateStatistics();
            }
          } catch (error) {
            console.error('[RegistrationService] Failed to trigger analytics aggregation via manager:', error);
          }
        }
      } catch (error) {
        console.error('[RegistrationService] Error triggering analytics aggregation:', error);
      }
    }, 100); // Short delay to ensure the registration operation completes first
  }

  /**
   * Flush all registrations from the system
   */
  async flushAllRegistrations(): Promise<Response> {
    try {
      console.log('[RegistrationService] Flushing all registrations');
      
      // 1. Get all registration IDs
      const registrationIds = await this.state.storage.list<string>({ prefix: 'registration:' });
      
      // 2. Get all trail registrations maps
      const trailRegistrationsEntries = await this.state.storage.list<TrailRegistrationMap>({ prefix: 'trail_registrations:' });
      
      // 3. Delete all registration Durable Objects
      for (const [key, id] of registrationIds) {
        try {
          const registrationId = key.substring(13); // Remove 'registration:' prefix
          
          // Delete the registration Durable Object
          const registrationDO = this.env.REGISTRATION_DO.get(
            this.env.REGISTRATION_DO.idFromString(id)
          );
          
          await registrationDO.fetch('https://dummy-url/', {
            method: 'DELETE'
          });
          
          // Delete the registration mapping
          await this.state.storage.delete(key);
          
        } catch (error) {
          console.error(`Error deleting registration for key ${key}:`, error);
          // Continue with other deletions
        }
      }
      
      // 4. Clear all trail registration maps
      for (const [key] of trailRegistrationsEntries) {
        try {
          // Reset the registration list for this trail
          await this.state.storage.put(key, { registrationIds: [] });
        } catch (error) {
          console.error(`Error clearing trail registrations for key ${key}:`, error);
          // Continue with other operations
        }
      }
      
      // 5. Invalidate all caches
      this.invalidateAllCaches(null);
      
      return new Response(JSON.stringify({ success: true, message: 'All registrations flushed successfully' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error in flushAllRegistrations:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Error flushing registrations: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
}