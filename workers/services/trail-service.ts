import { type TrailData } from '../durable-objects/trail';
import { TrailManagerDO } from '../durable-objects/trail-manager';
import type { RegistrationData } from '../durable-objects/registration';

/**
 * Service to handle all trail-related operations
 */
export class TrailService {
  state: DurableObjectState;
  env: Env;
  manager: TrailManagerDO;
  
  constructor(state: DurableObjectState, env: Env, manager: TrailManagerDO) {
    this.state = state;
    this.env = env;
    this.manager = manager;
  }
  
  async handleRequest(request: Request, path: string): Promise<Response> {
    // Get a list of all trails
    if (path === '/trails' && request.method === 'GET') {
      return await this.getAllTrails();
    }
    
    // Create a new trail
    if (path === '/trails' && request.method === 'POST') {
      const data = await request.json() as Partial<TrailData>;
      return await this.createTrail(data);
    }
    
    // Public trail info - returns minimal data for public endpoints
    if (path.startsWith('/public/trails/') && request.method === 'GET') {
      const trailId = path.split('/')[3]; // Extract ID from /public/trails/:id
      return await this.getPublicTrailInfo(trailId);
    }
    
    // Operations on a specific trail
    const trailId = this.getIdFromPath(path);
    if (!trailId) {
      return new Response('Trail ID required', { status: 400 });
    }
    
    // Get specific trail
    if (path === `/trails/${trailId}` && request.method === 'GET') {
      return await this.getTrail(trailId);
    }
    
    // Update specific trail
    if (path === `/trails/${trailId}` && request.method === 'PUT') {
      const data = await request.json() as Partial<TrailData>;
      return await this.updateTrail(trailId, data);
    }
    
    // Delete specific trail
    if (path === `/trails/${trailId}` && request.method === 'DELETE') {
      return await this.deleteTrail(trailId);
    }
    
    // Get registrations for a specific trail
    if (path === `/trails/${trailId}/registrations` && request.method === 'GET') {
      return await this.getTrailRegistrations(trailId);
    }
    
    // Generate QR code for a specific trail
    if (path === `/trails/${trailId}/generate-qr` && request.method === 'POST') {
      return await this.generateTrailQRCode(trailId, request);
    }
    
    return new Response('Not found', { status: 404 });
  }
  
  // Utility to extract ID from URL path
  private getIdFromPath(path: string): string | null {
    const parts = path.split('/');
    return parts.length > 2 ? parts[2] : null;
  }
  
  async getAllTrails(): Promise<Response> {
    // Try to get from cache first
    const cacheKey = 'all-trails';
    const cachedTrails = this.manager.getFromCache<TrailData[]>(cacheKey);
    
    if (cachedTrails) {
      console.log('[TrailService] Returning cached trails data');
      return new Response(JSON.stringify(cachedTrails), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('[TrailService] Cache miss for trails data, fetching from storage');
    
    // Get all trail IDs stored in the manager
    const trailIds = await this.state.storage.list<string>({ prefix: 'trail:' });
    
    // Fetch each trail's data from its Durable Object
    const trails: TrailData[] = [];
    const batchSize = 10; // Process in batches to prevent too many parallel requests
    const batches = [];
    
    // Split into batches for processing
    let currentBatch: [string, string][] = [];
    for (const entry of trailIds) {
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
        const trailId = key.substring(6); // Remove 'trail:' prefix
        
        try {
          // Convert the stored string to a DurableObjectId more safely
          let trailDO;
          try {
            trailDO = this.env.TRAIL_DO.get(this.env.TRAIL_DO.idFromString(id));
          } catch (error) {
            console.error(`Invalid Durable Object ID for trail ${trailId}: ${id}`);
            return null; // Skip this trail
          }
          
          const response = await trailDO.fetch('https://dummy-url/');
          if (response.status === 200) {
            const data = await response.json() as TrailData;
            
            // Get registration count for this trail - try to get from cache
            const registrationCountCacheKey = `trail-reg-count:${trailId}`;
            let registrationCount = this.manager.getFromCache<number>(registrationCountCacheKey);
            
            if (registrationCount === null) {
              // Not in cache, get from storage
              const trailRegistrations = await this.state.storage.get<{registrationIds: string[]}>(`trail_registrations:${trailId}`);
              registrationCount = trailRegistrations ? trailRegistrations.registrationIds.length : 0;
              
              // Store in cache for future requests
              this.manager.setInCache(registrationCountCacheKey, registrationCount, 2 * 60 * 1000); // 2 minutes TTL
            }
            
            // Add registration count to trail data
            data.registrationCount = registrationCount;
            
            // Calculate horse count for this trail - try to get from cache first
            const horseCountCacheKey = `trail-horse-count:${trailId}`;
            let horseCount = this.manager.getFromCache<number>(horseCountCacheKey);
            
            if (horseCount === null) {
              horseCount = 0;
              // Get the registrations for this trail
              const trailRegistrations = await this.state.storage.get<{registrationIds: string[]}>(`trail_registrations:${trailId}`);
              
              if (trailRegistrations && trailRegistrations.registrationIds.length > 0) {
                // Process registrations in smaller batches to avoid memory issues
                const regBatchSize = 20;
                const regBatches = [];
                
                let currentRegBatch = [];
                for (const regId of trailRegistrations.registrationIds) {
                  currentRegBatch.push(regId);
                  if (currentRegBatch.length >= regBatchSize) {
                    regBatches.push([...currentRegBatch]);
                    currentRegBatch = [];
                  }
                }
                
                if (currentRegBatch.length > 0) {
                  regBatches.push(currentRegBatch);
                }
                
                // Process each batch of registrations
                for (const regBatch of regBatches) {
                  const regPromises = regBatch.map(async (regId) => {
                    try {
                      const regObjectId = await this.state.storage.get<string>(`registration:${regId}`);
                      if (!regObjectId) return 0;
                      
                      const regDO = this.env.REGISTRATION_DO.get(
                        this.env.REGISTRATION_DO.idFromString(regObjectId)
                      );
                      
                      const regResponse = await regDO.fetch('https://dummy-url/');
                      if (regResponse.status === 200) {
                        const regData = await regResponse.json() as RegistrationData;
                        return regData.horseCount || 0;
                      }
                    } catch (error) {
                      console.error(`Error fetching registration ${regId}:`, error);
                    }
                    return 0;
                  });
                  
                  const horseCounts = await Promise.all(regPromises);
                  horseCount += horseCounts.reduce((sum, count) => sum + count, 0);
                }
              }
              
              // Cache the horse count
              this.manager.setInCache(horseCountCacheKey, horseCount, 2 * 60 * 1000); // 2 minutes TTL
            }
            
            // Add horse count to trail data
            data.horseCount = horseCount;
            
            // Only include active trails for public views
            if (data.active !== false) {
              return data;
            }
          }
        } catch (error) {
          console.error(`Error fetching trail ${trailId}:`, error);
        }
        return null;
      });
      
      // Wait for the batch to complete
      const batchResults = await Promise.all(batchPromises);
      trails.push(...batchResults.filter(trail => trail !== null) as TrailData[]);
    }
    
    // Cache the results
    this.manager.setInCache(cacheKey, trails, 60 * 1000); // 1 minute TTL
    
    return new Response(JSON.stringify(trails), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  async createTrail(data: Partial<TrailData>): Promise<Response> {
    // Generate a unique ID for the new trail
    const trailId = crypto.randomUUID();
    
    // Create a new Durable Object for this trail
    const trailObjectId = this.env.TRAIL_DO.newUniqueId();
    const trailObject = this.env.TRAIL_DO.get(trailObjectId);
    
    // Store the mapping between trail ID and Durable Object ID
    await this.state.storage.put(`trail:${trailId}`, trailObjectId.toString());
    
    // Set the ID in the trail data
    data.id = trailId;
    
    // Initialize the trail data in the Durable Object
    const response = await trailObject.fetch('https://dummy-url/', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    
    // Invalidate cache on successful creation
    if (response.status === 200) {
      this.invalidateAllTrailCaches();
    }
    
    return response;
  }
  
  async getTrail(trailId: string): Promise<Response> {
    // Get the Durable Object ID for this trail
    const trailObjectId = await this.state.storage.get<string>(`trail:${trailId}`);
    
    if (!trailObjectId) {
      return new Response('Trail not found', { status: 404 });
    }
    
    // Get the trail data from its Durable Object
    const trailObject = this.env.TRAIL_DO.get(this.env.TRAIL_DO.idFromString(trailObjectId));
    const response = await trailObject.fetch('https://dummy-url/');
    
    if (response.status === 200) {
      const data = await response.json() as TrailData;
      
      // Get registration count for this trail
      const trailRegistrations = await this.state.storage.get<{registrationIds: string[]}>(`trail_registrations:${trailId}`);
      const registrationCount = trailRegistrations ? trailRegistrations.registrationIds.length : 0;
      
      // Add registration count to trail data
      data.registrationCount = registrationCount;
      
      // Calculate horse count for this trail - try to get from cache first
      const horseCountCacheKey = `trail-horse-count:${trailId}`;
      let horseCount = this.manager.getFromCache<number>(horseCountCacheKey);
      
      if (horseCount === null) {
        horseCount = 0;
        if (trailRegistrations && trailRegistrations.registrationIds.length > 0) {
          // Process registrations in batches
          const regBatchSize = 20;
          const regBatches = [];
          
          let currentRegBatch = [];
          for (const regId of trailRegistrations.registrationIds) {
            currentRegBatch.push(regId);
            if (currentRegBatch.length >= regBatchSize) {
              regBatches.push([...currentRegBatch]);
              currentRegBatch = [];
            }
          }
          
          if (currentRegBatch.length > 0) {
            regBatches.push(currentRegBatch);
          }
          
          // Process each batch of registrations
          for (const regBatch of regBatches) {
            const regPromises = regBatch.map(async (regId) => {
              try {
                const regObjectId = await this.state.storage.get<string>(`registration:${regId}`);
                if (!regObjectId) return 0;
                
                const regDO = this.env.REGISTRATION_DO.get(
                  this.env.REGISTRATION_DO.idFromString(regObjectId)
                );
                
                const regResponse = await regDO.fetch('https://dummy-url/');
                if (regResponse.status === 200) {
                  const regData = await regResponse.json() as RegistrationData;
                  return regData.horseCount || 0;
                }
              } catch (error) {
                console.error(`Error fetching registration ${regId}:`, error);
              }
              return 0;
            });
            
            const horseCounts = await Promise.all(regPromises);
            horseCount += horseCounts.reduce((sum, count) => sum + count, 0);
          }
        }
        
        // Cache the horse count
        this.manager.setInCache(horseCountCacheKey, horseCount, 2 * 60 * 1000); // 2 minutes TTL
      }
      
      // Add horse count to trail data
      data.horseCount = horseCount;
      
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return response;
  }
  
  async updateTrail(trailId: string, data: Partial<TrailData>): Promise<Response> {
    // Get the Durable Object ID for this trail
    const trailObjectId = await this.state.storage.get<string>(`trail:${trailId}`);
    
    if (!trailObjectId) {
      return new Response('Trail not found', { status: 404 });
    }
    
    // Update the trail data in its Durable Object
    const trailObject = this.env.TRAIL_DO.get(
      this.env.TRAIL_DO.idFromString(trailObjectId)
    );
    
    const response = await trailObject.fetch('https://dummy-url/', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    
    // Invalidate caches on successful update
    if (response.status === 200) {
      this.invalidateAllTrailCaches(trailId);
    }
    
    return response;
  }
  
  async deleteTrail(trailId: string): Promise<Response> {
    // Get the Durable Object ID for this trail
    const trailObjectId = await this.state.storage.get<string>(`trail:${trailId}`);
    
    if (!trailObjectId) {
      return new Response('Trail not found', { status: 404 });
    }
    
    // Delete the trail in its Durable Object
    const trailObject = this.env.TRAIL_DO.get(
      this.env.TRAIL_DO.idFromString(trailObjectId)
    );
    
    // Get all registrations for this trail and delete them
    const trailRegistrations = await this.state.storage.get<{registrationIds: string[]}>(`trail_registrations:${trailId}`);
    
    if (trailRegistrations && trailRegistrations.registrationIds.length > 0) {
      // Process in batches to avoid memory issues with large datasets
      const batchSize = 50;
      const batches = [];
      
      let currentBatch: string[] = [];
      for (const regId of trailRegistrations.registrationIds) {
        currentBatch.push(regId);
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
        await Promise.all(batch.map(async (regId) => {
          try {
            const regObjectId = await this.state.storage.get<string>(`registration:${regId}`);
            if (!regObjectId) return;
            
            const regDO = this.env.REGISTRATION_DO.get(
              this.env.REGISTRATION_DO.idFromString(regObjectId)
            );
            
            // Delete the registration
            await regDO.fetch('https://dummy-url/', { method: 'DELETE' });
            
            // Remove the registration mapping
            await this.state.storage.delete(`registration:${regId}`);
          } catch (error) {
            console.error(`Error deleting registration ${regId}:`, error);
          }
        }));
      }
      
      // Delete the trail_registrations entry
      await this.state.storage.delete(`trail_registrations:${trailId}`);
    }
    
    // Delete the trail mapping
    await this.state.storage.delete(`trail:${trailId}`);
    
    const response = await trailObject.fetch('https://dummy-url/', {
      method: 'DELETE'
    });
    
    // Invalidate caches on successful deletion
    if (response.status === 200) {
      this.invalidateAllTrailCaches();
    }
    
    return response;
  }
  
  async getTrailRegistrations(trailId: string): Promise<Response> {
    // NEW APPROACH: Get registrations from the trail registrations map
    const trailRegistrations = await this.state.storage.get<{registrationIds: string[]}>(`trail_registrations:${trailId}`);
    
    if (!trailRegistrations || trailRegistrations.registrationIds.length === 0) {
      // No registrations for this trail
      return new Response(JSON.stringify([]), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Fetch each registration's data from its Durable Object
    const registrations = [];
    
    for (const registrationId of trailRegistrations.registrationIds) {
      try {
        // Get the Durable Object ID for this registration
        const registrationObjectId = await this.state.storage.get<string>(`registration:${registrationId}`);
        
        if (!registrationObjectId) {
          console.warn(`Registration ID ${registrationId} found in trail map but no DO ID exists`);
          continue; // Skip this registration if no DO ID exists
        }
        
        // Safely get the Durable Object
        let registrationDO;
        try {
          registrationDO = this.env.REGISTRATION_DO.get(
            this.env.REGISTRATION_DO.idFromString(registrationObjectId)
          );
        } catch (error) {
          console.error(`Invalid Durable Object ID for registration ${registrationId}: ${registrationObjectId}`);
          continue; // Skip this registration and continue with others
        }
        
        const response = await registrationDO.fetch('https://dummy-url/');
        if (response.status === 200) {
          const data = await response.json();
          registrations.push(data);
        }
      } catch (error) {
        console.error(`Error fetching registration ${registrationId}:`, error);
        // Continue processing other registrations rather than failing the whole request
      }
    }
    
    return new Response(JSON.stringify(registrations), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async getPublicTrailInfo(trailId: string): Promise<Response> {
    // Get the Durable Object ID for this trail
    const trailObjectId = await this.state.storage.get<string>(`trail:${trailId}`);
    
    if (!trailObjectId) {
      return new Response('Trail not found', { status: 404 });
    }
    
    // Get the trail data from its Durable Object
    const trailObject = this.env.TRAIL_DO.get(this.env.TRAIL_DO.idFromString(trailObjectId));
    const response = await trailObject.fetch('https://dummy-url/');
    
    if (response.status === 200) {
      const fullData = await response.json() as TrailData;
      
      // Filter to only include the minimal data needed for public registration
      const publicData = {
        id: fullData.id,
        name: fullData.name,
        description: fullData.description,
        location: fullData.location,
        active: fullData.active,
      };
      
      // Check if trail is active
      if (!publicData.active) {
        return new Response('Trail is not active', { status: 403 });
      }
      
      return new Response(JSON.stringify(publicData), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return response;
  }

  /**
   * Generate QR code for a specific trail
   */
  async generateTrailQRCode(trailId: string, request: Request): Promise<Response> {
    // Get the Durable Object ID for this trail
    const trailObjectId = await this.state.storage.get<string>(`trail:${trailId}`);
    
    if (!trailObjectId) {
      return new Response('Trail not found', { status: 404 });
    }
    
    // Get the trail Durable Object
    const trailObject = this.env.TRAIL_DO.get(
      this.env.TRAIL_DO.idFromString(trailObjectId)
    );
    
    // Forward the generate-qr request to the trail Durable Object
    // with all the original headers (including X-Forwarded-Origin)
    const response = await trailObject.fetch('https://dummy-url/generate-qr', {
      method: 'POST',
      headers: request.headers
    });
    
    // Invalidate caches on successful QR code generation
    if (response.status === 200) {
      this.invalidateAllTrailCaches(trailId);
    }
    
    return response;
  }

  // Helper method to invalidate all trail-related caches
  private invalidateAllTrailCaches(specificTrailId?: string): void {
    console.log(`[TrailService] Invalidating all trail caches ${specificTrailId ? 'for trail: ' + specificTrailId : ''}`);
    
    // Invalidate general trail caches
    this.manager.invalidateCache('all-trails');
    this.manager.invalidateCache('trails-name-map');
    
    // Invalidate specific trail caches if we have a trail ID
    if (specificTrailId) {
      this.manager.invalidateCache(`trail:${specificTrailId}`);
      this.manager.invalidateCache(`trail-reg-count:${specificTrailId}`);
      this.manager.invalidateCache(`trail-horse-count:${specificTrailId}`);
    }
    
    // Invalidate statistics caches since they depend on trail data
    this.manager.invalidateCache('summary-statistics');
    this.manager.invalidateCache('registrations:'); // This prefix will match all paginated registration data
  }
}