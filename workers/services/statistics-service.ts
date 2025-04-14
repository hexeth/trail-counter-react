import type { TrailData } from '../durable-objects/trail';
import type { RegistrationData } from '../durable-objects/registration';
import { TrailManagerDO } from '../durable-objects/trail-manager';
import type { AnalyticsTimeEntry, AnalyticsData } from '../../lib/api';

// Helper types for analytics processing
interface TrailInfo {
  id: string;
  name: string;
  active: boolean;
}

interface ProcessedRegistration {
  id: string;
  trailId: string;
  trailName: string;
  horseCount: number;
  timestamp: string;
  date: string;
  weekKey: string;
  weekLabel: string;
  monthKey: string;
  monthLabel: string;
}

/**
 * Service to handle all statistics-related operations with pagination support
 */
export class StatisticsService {
  state: DurableObjectState;
  env: Env;
  manager: TrailManagerDO;
  
  constructor(state: DurableObjectState, env: Env, manager: TrailManagerDO) {
    this.state = state;
    this.env = env;
    this.manager = manager;
  }
  
  async handleStatisticsRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    if (request.method === 'GET') {
      // Check for specific endpoints
      if (url.pathname.endsWith('/analytics')) {
        // New endpoint for pre-aggregated analytics data
        return await this.getAnalytics();
      } else if (url.pathname.endsWith('/registrations')) {
        const page = parseInt(url.searchParams.get('page') || '1', 10);
        const limit = parseInt(url.searchParams.get('limit') || '10', 10);
        const trail = url.searchParams.get('trail') || null;
        const startDate = url.searchParams.get('startDate') || null;
        const endDate = url.searchParams.get('endDate') || null;
        const timezone = url.searchParams.get('timezone') || null;
        
        return await this.getRegistrationData(page, limit, trail, startDate, endDate, timezone);
      } else {
        // For backward compatibility, still support the summary endpoint
        return await this.getSummaryStatistics();
      }
    } else if (request.method === 'POST' && url.pathname.endsWith('/aggregate')) {
      // Allow forcing a re-aggregation of analytics data
      await this.aggregateAnalytics();
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response('Method not allowed', { status: 405 });
  }
  
  /**
   * Returns paginated registration data in a tabular format
   */
  async getRegistrationData(
    page: number = 1, 
    limit: number = 10,
    trailFilter: string | null = null,
    startDate: string | null = null,
    endDate: string | null = null,
    timezone: string | null = null
  ): Promise<Response> {
    // Validate pagination parameters
    if (page < 1) page = 1;
    if (limit < 1) limit = 10;
    if (limit > 100) limit = 100; // Cap the maximum limit
    
    // Create a cache key based on all parameters
    const cacheKey = `registrations:${page}:${limit}:${trailFilter || 'all'}:${startDate || 'none'}:${endDate || 'none'}:${timezone || 'UTC'}`;
    
    // Try to get from cache first - Deep clone to avoid I/O object references
    const cachedData = this.manager.getFromCache<any>(cacheKey);
    if (cachedData) {
      console.log(`[StatisticsService] Returning cached registration data for ${cacheKey}`);
      // Create a new object to break any references to I/O objects
      const safeData = JSON.parse(JSON.stringify(cachedData));
      return new Response(JSON.stringify(safeData), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log(`[StatisticsService] Cache miss for registration data ${cacheKey}`);
    
    // Build a map of trail IDs to names for faster lookup
    let trailsMap = this.manager.getFromCache<Record<string, string>>('trails-name-map');
    if (!trailsMap) {
      trailsMap = {};
      const trailIds = await this.state.storage.list<string>({ prefix: 'trail:' });
      
      // Process trails in batches to avoid too many parallel requests
      const batchSize = 10;
      const batches = [];
      
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
        await Promise.all(batch.map(async ([key, id]) => {
          const trailId = key.substring(6); // Remove 'trail:' prefix
          try {
            const trailDO = this.env.TRAIL_DO.get(this.env.TRAIL_DO.idFromString(id));
            const response = await trailDO.fetch('https://dummy-url/');
            if (response.status === 200) {
              const data = await response.json() as TrailData;
              trailsMap![trailId] = data.name || 'Unknown';
            }
          } catch (error) {
            console.error(`Error fetching trail name for ${trailId}:`, error);
            trailsMap![trailId] = 'Unknown';
          }
        }));
      }
      
      // Cache the trails map for future use - Create a deep copy to avoid I/O references
      this.manager.setInCache('trails-name-map', JSON.parse(JSON.stringify(trailsMap)), 5 * 60 * 1000); // 5-minute TTL
    }
    
    // Get all registration IDs
    const registrationIds = await this.state.storage.list<string>({ prefix: 'registration:' });
    const registrationList: RegistrationTableItem[] = [];
    
    // Process in batches to avoid memory issues with large datasets
    const regBatchSize = 50;
    const regBatches = [];
    
    let currentRegBatch: [string, string][] = [];
    for (const entry of registrationIds) {
      currentRegBatch.push(entry);
      if (currentRegBatch.length >= regBatchSize) {
        regBatches.push([...currentRegBatch]);
        currentRegBatch = [];
      }
    }
    
    if (currentRegBatch.length > 0) {
      regBatches.push(currentRegBatch);
    }
    
    // Process each batch
    for (const batch of regBatches) {
      const batchPromises = batch.map(async ([key, registrationObjectId]) => {
        try {
          // Skip invalid entries
          if (!registrationObjectId) return null;
          
          // Get registration DO
          const registrationDO = this.env.REGISTRATION_DO.get(
            this.env.REGISTRATION_DO.idFromString(registrationObjectId)
          );
          
          // Fetch registration data
          const regResponse = await registrationDO.fetch('https://dummy-url/');
          
          if (regResponse.status === 200) {
            // Clone the data immediately to avoid I/O object references
            const regDataText = await regResponse.text();
            const regData = JSON.parse(regDataText) as RegistrationData;
            
            let regDate = regData.timestamp ? new Date(regData.timestamp).toISOString().split('T')[0] : 'Unknown';
            
            // If timezone is provided, adjust the date to that timezone
            if (timezone && regData.timestamp) {
              try {
                const options: Intl.DateTimeFormatOptions = { 
                  timeZone: timezone,
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit'
                };
                const formatter = new Intl.DateTimeFormat('en-US', options);
                const parts = formatter.formatToParts(new Date(regData.timestamp));
                const month = parts.find(part => part.type === 'month')?.value || '01';
                const day = parts.find(part => part.type === 'day')?.value || '01';
                const year = parts.find(part => part.type === 'year')?.value || '2023';
                regDate = `${year}-${month}-${day}`;
              } catch (error) {
                console.error(`Error converting date to timezone ${timezone}:`, error);
              }
            }
            
            // Apply date filtering if provided
            if (startDate && regDate < startDate) return null;
            if (endDate && regDate > endDate) return null;
            
            // Get trail name from our cached map
            const trailName = regData.trailId ? (trailsMap[regData.trailId] || 'Unknown') : 'Unknown';
            
            // Apply trail filter if provided
            if (trailFilter && trailName !== trailFilter) return null;
            
            // Add to our table data
            return {
              id: key.substring(13), // Remove 'registration:' prefix
              date: regDate,
              trail: trailName,
              trailId: regData.trailId || 'unknown',
              riderName: regData.riderName || 'Unknown',
              horseCount: regData.horseCount || 1,
              timestamp: regData.timestamp || ''
            };
          }
        } catch (error) {
          console.error(`Error processing registration: ${error}`);
        }
        return null;
      });
      
      // Wait for the batch to complete
      const batchResults = await Promise.all(batchPromises);
      registrationList.push(...batchResults.filter(item => item !== null) as RegistrationTableItem[]);
    }
    
    // Sort registrations by date (newest first)
    registrationList.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    
    // Calculate pagination
    const totalItems = registrationList.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = Math.min(startIndex + limit, totalItems);
    
    // Get the items for the current page
    const paginatedItems = registrationList.slice(startIndex, endIndex);
    
    // Response object with pagination metadata
    const response = {
      data: paginatedItems,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      filters: {
        trail: trailFilter,
        startDate,
        endDate,
        timezone
      }
    };
    
    // Cache the results - use a shorter TTL for filtered/paginated data
    // Create a deep copy before caching to avoid I/O object references
    this.manager.setInCache(cacheKey, JSON.parse(JSON.stringify(response)), 30 * 1000); // 30 seconds TTL
    
    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  /**
   * Returns summary statistics (backward compatibility)
   */
  async getSummaryStatistics(): Promise<Response> {
    // Try to get from cache first
    const cacheKey = 'summary-statistics';
    const cachedStats = this.manager.getFromCache<any>(cacheKey);
    
    if (cachedStats) {
      console.log('[StatisticsService] Returning cached summary statistics');
      return new Response(JSON.stringify(cachedStats), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('[StatisticsService] Cache miss for summary statistics');
    
    // Get all trail IDs stored in the manager
    const trailIds = await this.state.storage.list<string>({ prefix: 'trail:' });
    
    // Counters for statistics
    let totalTrails = 0;
    let activeTrails = 0;
    let totalRegistrations = 0;
    const registrationsByTrail: Record<string, number> = {};
    const registrationsByDate: Record<string, number> = {};
    
    // Process trails in batches
    const batchSize = 10;
    const batches = [];
    
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
      await Promise.all(batch.map(async ([key, id]) => {
        const trailId = key.substring(6); // Remove 'trail:' prefix
        
        try {
          // Get trail data
          const trailDO = this.env.TRAIL_DO.get(this.env.TRAIL_DO.idFromString(id));
          const response = await trailDO.fetch('https://dummy-url/');
          
          if (response.status === 200) {
            const data = await response.json() as TrailData;
            totalTrails++;
            
            if (data.active) {
              activeTrails++;
            }
            
            // Get registrations for this trail - try to get count from cache first
            const regCountCacheKey = `trail-reg-count:${trailId}`;
            let regCount = this.manager.getFromCache<number>(regCountCacheKey);
            
            if (regCount === null) {
              // Not in cache, get from storage
              const trailRegistrations = await this.state.storage.get<{registrationIds: string[]}>(`trail_registrations:${trailId}`);
              regCount = trailRegistrations ? trailRegistrations.registrationIds.length : 0;
              
              // Cache the count
              this.manager.setInCache(regCountCacheKey, regCount, 2 * 60 * 1000); // 2 minutes TTL
            }
            
            totalRegistrations += regCount;
            registrationsByTrail[data.name || trailId] = regCount;
          }
        } catch (error) {
          console.error(`Error processing trail ${trailId}:`, error);
        }
      }));
    }
    
    // Assemble statistics object
    const statistics = {
      totalTrails,
      activeTrails,
      totalRegistrations,
      registrationsByTrail,
      registrationsByDate,
      generatedAt: new Date().toISOString()
    };
    
    // Cache the results
    this.manager.setInCache(cacheKey, statistics, 60 * 1000); // 1 minute TTL
    
    return new Response(JSON.stringify(statistics), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Returns pre-aggregated analytics data
   */
  async getAnalytics(): Promise<Response> {
    // Try to get from cache first
    const cacheKey = 'analytics-data';
    const cachedData = this.manager.getFromCache<AnalyticsData>(cacheKey);
    
    if (cachedData) {
      console.log('[StatisticsService] Returning cached analytics data');
      return new Response(JSON.stringify(cachedData), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('[StatisticsService] Cache miss for analytics data');
    
    // Try to get from storage
    const storedData = await this.state.storage.get<AnalyticsData>('analytics:data');
    
    if (storedData) {
      // Cache the data for future requests
      this.manager.setInCache(cacheKey, storedData, 10 * 60 * 1000); // 10 minute TTL
      
      return new Response(JSON.stringify(storedData), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // If not found in storage, trigger a new aggregation
    console.log('[StatisticsService] No analytics data found, triggering aggregation');
    await this.aggregateAnalytics();
    
    // Get the newly aggregated data
    const freshData = await this.state.storage.get<AnalyticsData>('analytics:data');
    
    if (freshData) {
      this.manager.setInCache(cacheKey, freshData, 10 * 60 * 1000); // 10 minute TTL
      return new Response(JSON.stringify(freshData), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // If something went wrong with aggregation, return empty analytics structure
    const emptyData: AnalyticsData = {
      daily: [],
      weekly: [],
      monthly: [],
      byTrail: {},
      lastUpdated: new Date().toISOString()
    };
    
    return new Response(JSON.stringify(emptyData), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  /**
   * Aggregates registration data into pre-computed analytics
   * This should be called periodically or after significant data changes
   */
  async aggregateAnalytics(): Promise<void> {
    console.log('[StatisticsService] Starting analytics aggregation');
    
    try {
      // Step 1: Get all trail information
      const trails = await this.getAllTrails();
      
      // Step 2: Get all registration data
      const registrations = await this.getAllRegistrations(trails);
      
      // Step 3: Process registrations into time-based groups
      const { daily, weekly, monthly, byTrail } = this.processRegistrations(registrations);
      
      // Step 4: Assemble the analytics data
      const analyticsData: AnalyticsData = {
        daily,
        weekly,
        monthly,
        byTrail,
        lastUpdated: new Date().toISOString()
      };
      
      // Step 5: Store the analytics data
      await this.state.storage.put('analytics:data', analyticsData);
      
      // Also cache it for immediate use
      this.manager.setInCache('analytics-data', analyticsData, 10 * 60 * 1000); // 10 minute TTL
      
      console.log('[StatisticsService] Analytics aggregation complete');
    } catch (error) {
      console.error('[StatisticsService] Error during analytics aggregation:', error);
    }
  }
  
  /**
   * Public method to aggregate statistics directly
   * This is specifically designed to be called directly by other services
   * without using the fetch API to avoid DNS issues in the local dev environment.
   */
  async aggregateStatistics(): Promise<void> {
    try {
      // Just delegate to the existing implementation
      await this.aggregateAnalytics();
    } catch (error) {
      console.error('[StatisticsService] Error during direct statistics aggregation:', error);
    }
  }
  
  /**
   * Gets information about all trails
   */
  private async getAllTrails(): Promise<Map<string, TrailInfo>> {
    const trailMap = new Map<string, TrailInfo>();
    const trailIds = await this.state.storage.list<string>({ prefix: 'trail:' });
    
    // Process trails in batches
    const batchSize = 10;
    const batches = [];
    
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
      await Promise.all(batch.map(async ([key, id]) => {
        const trailId = key.substring(6); // Remove 'trail:' prefix
        
        try {
          const trailDO = this.env.TRAIL_DO.get(this.env.TRAIL_DO.idFromString(id));
          const response = await trailDO.fetch('https://dummy-url/');
          
          if (response.status === 200) {
            const data = await response.json() as TrailData;
            trailMap.set(trailId, {
              id: trailId,
              name: data.name || 'Unknown',
              active: data.active || false
            });
          }
        } catch (error) {
          console.error(`Error processing trail ${trailId}:`, error);
        }
      }));
    }
    
    return trailMap;
  }
  
  /**
   * Fetches and processes all registrations
   */
  private async getAllRegistrations(trailMap: Map<string, TrailInfo>): Promise<ProcessedRegistration[]> {
    const registrationIds = await this.state.storage.list<string>({ prefix: 'registration:' });
    const processedRegistrations: ProcessedRegistration[] = [];
    
    // Process in batches to avoid memory issues with large datasets
    const regBatchSize = 50;
    const regBatches = [];
    
    let currentRegBatch: [string, string][] = [];
    for (const entry of registrationIds) {
      currentRegBatch.push(entry);
      if (currentRegBatch.length >= regBatchSize) {
        regBatches.push([...currentRegBatch]);
        currentRegBatch = [];
      }
    }
    
    if (currentRegBatch.length > 0) {
      regBatches.push(currentRegBatch);
    }
    
    // Process each batch
    for (const batch of regBatches) {
      const batchPromises = batch.map(async ([key, registrationObjectId]) => {
        try {
          // Skip invalid entries
          if (!registrationObjectId) return null;
          
          // Get registration DO
          const registrationDO = this.env.REGISTRATION_DO.get(
            this.env.REGISTRATION_DO.idFromString(registrationObjectId)
          );
          
          // Fetch registration data
          const regResponse = await registrationDO.fetch('https://dummy-url/');
          
          if (regResponse.status === 200) {
            const regData = await regResponse.json() as RegistrationData;
            if (!regData.timestamp) return null;
            
            const date = new Date(regData.timestamp);
            const trailId = regData.trailId || 'unknown';
            const trailInfo = trailMap.get(trailId);
            
            // Format date parts
            const dateStr = date.toISOString().split('T')[0];
            const year = date.getFullYear();
            const weekNum = this.getWeekNumber(date);
            const weekKey = `${year}-W${weekNum}`;
            const weekLabel = `${year} Week ${weekNum}`;
            const month = date.getMonth() + 1;
            const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
            const monthLabel = `${this.getMonthName(date)} ${year}`;
            
            return {
              id: key.substring(13), // Remove 'registration:' prefix
              trailId,
              trailName: trailInfo ? trailInfo.name : 'Unknown',
              horseCount: regData.horseCount || 1,
              timestamp: regData.timestamp,
              date: dateStr,
              weekKey,
              weekLabel,
              monthKey,
              monthLabel
            };
          }
        } catch (error) {
          console.error(`Error processing registration: ${error}`);
        }
        return null;
      });
      
      // Wait for the batch to complete
      const batchResults = await Promise.all(batchPromises);
      processedRegistrations.push(...batchResults.filter(item => item !== null) as ProcessedRegistration[]);
    }
    
    return processedRegistrations;
  }
  
  /**
   * Processes registrations into time-based analytics
   */
  private processRegistrations(registrations: ProcessedRegistration[]): {
    daily: AnalyticsTimeEntry[];
    weekly: AnalyticsTimeEntry[];
    monthly: AnalyticsTimeEntry[];
    byTrail: Record<string, { totalHorses: number; totalRegistrations: number; averageHorsesPerRegistration: number; }>;
  } {
    // Group by day
    const dailyGroups = new Map<string, {
      entries: ProcessedRegistration[];
      byTrail: Map<string, { entries: ProcessedRegistration[] }>;
    }>();
    
    // Group by week
    const weeklyGroups = new Map<string, {
      entries: ProcessedRegistration[];
      weekLabel: string;
      byTrail: Map<string, { entries: ProcessedRegistration[] }>;
    }>();
    
    // Group by month
    const monthlyGroups = new Map<string, {
      entries: ProcessedRegistration[];
      monthLabel: string;
      byTrail: Map<string, { entries: ProcessedRegistration[] }>;
    }>();
    
    // Group by trail
    const trailGroups = new Map<string, {
      entries: ProcessedRegistration[];
      trailName: string;
    }>();
    
    // Process all registrations into their respective groups
    for (const reg of registrations) {
      // Daily grouping
      if (!dailyGroups.has(reg.date)) {
        dailyGroups.set(reg.date, { entries: [], byTrail: new Map() });
      }
      dailyGroups.get(reg.date)!.entries.push(reg);
      
      if (!dailyGroups.get(reg.date)!.byTrail.has(reg.trailName)) {
        dailyGroups.get(reg.date)!.byTrail.set(reg.trailName, { entries: [] });
      }
      dailyGroups.get(reg.date)!.byTrail.get(reg.trailName)!.entries.push(reg);
      
      // Weekly grouping
      if (!weeklyGroups.has(reg.weekKey)) {
        weeklyGroups.set(reg.weekKey, { 
          entries: [], 
          weekLabel: reg.weekLabel,
          byTrail: new Map() 
        });
      }
      weeklyGroups.get(reg.weekKey)!.entries.push(reg);
      
      if (!weeklyGroups.get(reg.weekKey)!.byTrail.has(reg.trailName)) {
        weeklyGroups.get(reg.weekKey)!.byTrail.set(reg.trailName, { entries: [] });
      }
      weeklyGroups.get(reg.weekKey)!.byTrail.get(reg.trailName)!.entries.push(reg);
      
      // Monthly grouping
      if (!monthlyGroups.has(reg.monthKey)) {
        monthlyGroups.set(reg.monthKey, { 
          entries: [], 
          monthLabel: reg.monthLabel,
          byTrail: new Map() 
        });
      }
      monthlyGroups.get(reg.monthKey)!.entries.push(reg);
      
      if (!monthlyGroups.get(reg.monthKey)!.byTrail.has(reg.trailName)) {
        monthlyGroups.get(reg.monthKey)!.byTrail.set(reg.trailName, { entries: [] });
      }
      monthlyGroups.get(reg.monthKey)!.byTrail.get(reg.trailName)!.entries.push(reg);
      
      // Trail grouping
      if (!trailGroups.has(reg.trailName)) {
        trailGroups.set(reg.trailName, { entries: [], trailName: reg.trailName });
      }
      trailGroups.get(reg.trailName)!.entries.push(reg);
    }
    
    // Convert daily groups to AnalyticsTimeEntry array
    const daily = Array.from(dailyGroups.entries())
      .map(([date, data]) => {
        const totalHorses = data.entries.reduce((sum, reg) => sum + reg.horseCount, 0);
        const totalRegistrations = data.entries.length;
        
        // Process by trail breakdown
        const byTrail: Record<string, { horseCount: number; registrationCount: number }> = {};
        for (const [trailName, trailData] of data.byTrail.entries()) {
          byTrail[trailName] = {
            horseCount: trailData.entries.reduce((sum, reg) => sum + reg.horseCount, 0),
            registrationCount: trailData.entries.length
          };
        }
        
        return {
          timeKey: date,
          label: date,
          totalHorses,
          totalRegistrations,
          byTrail
        };
      })
      .sort((a, b) => a.timeKey.localeCompare(b.timeKey));
    
    // Convert weekly groups to AnalyticsTimeEntry array
    const weekly = Array.from(weeklyGroups.entries())
      .map(([weekKey, data]) => {
        const totalHorses = data.entries.reduce((sum, reg) => sum + reg.horseCount, 0);
        const totalRegistrations = data.entries.length;
        
        // Process by trail breakdown
        const byTrail: Record<string, { horseCount: number; registrationCount: number }> = {};
        for (const [trailName, trailData] of data.byTrail.entries()) {
          byTrail[trailName] = {
            horseCount: trailData.entries.reduce((sum, reg) => sum + reg.horseCount, 0),
            registrationCount: trailData.entries.length
          };
        }
        
        return {
          timeKey: weekKey,
          label: data.weekLabel,
          totalHorses,
          totalRegistrations,
          byTrail
        };
      })
      .sort((a, b) => a.timeKey.localeCompare(b.timeKey));
    
    // Convert monthly groups to AnalyticsTimeEntry array
    const monthly = Array.from(monthlyGroups.entries())
      .map(([monthKey, data]) => {
        const totalHorses = data.entries.reduce((sum, reg) => sum + reg.horseCount, 0);
        const totalRegistrations = data.entries.length;
        
        // Process by trail breakdown
        const byTrail: Record<string, { horseCount: number; registrationCount: number }> = {};
        for (const [trailName, trailData] of data.byTrail.entries()) {
          byTrail[trailName] = {
            horseCount: trailData.entries.reduce((sum, reg) => sum + reg.horseCount, 0),
            registrationCount: trailData.entries.length
          };
        }
        
        return {
          timeKey: monthKey,
          label: data.monthLabel,
          totalHorses,
          totalRegistrations,
          byTrail
        };
      })
      .sort((a, b) => a.timeKey.localeCompare(b.timeKey));
    
    // Process trail summaries
    const byTrail: Record<string, { 
      totalHorses: number; 
      totalRegistrations: number; 
      averageHorsesPerRegistration: number; 
    }> = {};
    
    for (const [trailName, data] of trailGroups.entries()) {
      const totalHorses = data.entries.reduce((sum, reg) => sum + reg.horseCount, 0);
      const totalRegistrations = data.entries.length;
      
      byTrail[trailName] = {
        totalHorses,
        totalRegistrations,
        averageHorsesPerRegistration: totalRegistrations > 0 
          ? totalHorses / totalRegistrations 
          : 0
      };
    }
    
    return { daily, weekly, monthly, byTrail };
  }
  
  /**
   * Helper method to get week number
   */
  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }
  
  /**
   * Helper method to get month name
   */
  private getMonthName(date: Date): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[date.getMonth()];
  }
}

// Type for our tabular registration data
interface RegistrationTableItem {
  id: string;
  date: string;
  trail: string;
  trailId: string;
  riderName: string;
  horseCount: number;
  timestamp: string;
}