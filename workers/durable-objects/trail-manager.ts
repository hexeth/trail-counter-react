import { TrailService } from '../services/trail-service';
import { RegistrationService } from '../services/registration-service';
import { TemplateService } from '../services/template-service';
import { StatisticsService } from '../services/statistics-service';

// Interface for storing lists of IDs
interface TrailIndex {
  trailIds: string[];
}

interface RegistrationIndex {
  registrationIds: Record<string, string[]>; // trailId -> registration IDs
}

interface TemplateIndex {
  templateIds: string[];
  defaultTemplateId?: string;
}

// Cache interfaces
interface CacheEntry<T> {
  data: T;
  expires: number;
}

/**
 * TrailManager Durable Object to coordinate trails, registrations, and templates
 */

export class TrailManagerDO {
  state: DurableObjectState;
  env: Env;
  
  // Services
  private trailService: TrailService;
  private registrationService: RegistrationService;
  private templateService: TemplateService;
  private statisticsService: StatisticsService;
  
  // Cache for frequently accessed data
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly DEFAULT_CACHE_TTL_MS = 60 * 1000; // 1 minute default TTL
  
  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    
    // Initialize services
    this.trailService = new TrailService(state, env, this);
    this.registrationService = new RegistrationService(state, env, this);
    this.templateService = new TemplateService(state, env, this);
    this.statisticsService = new StatisticsService(state, env, this);
    
    // Set up cache cleanup interval
    this.setupCacheCleanup();
  }
  
  // Cache methods
  getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    // Check if entry is expired
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }
  
  setInCache<T>(key: string, data: T, ttlMs: number = this.DEFAULT_CACHE_TTL_MS): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttlMs
    });
  }
  
  invalidateCache(keyPrefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(keyPrefix)) {
        this.cache.delete(key);
      }
    }
  }
  
  private setupCacheCleanup(): void {
    // Clean up expired cache entries every minute
    const cleanup = () => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expires) {
          this.cache.delete(key);
        }
      }
    };
    
    // Set up interval
    setInterval(cleanup, 60 * 1000);
  }
  
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    let path = url.pathname;
    
    // Remove the /api prefix if present
    if (path.startsWith('/api/')) {
      path = path.substring(4); // Remove '/api' from the path
    }
    
    // Public Trail Operations - route to the trail service
    if (path.startsWith('/public/trails')) {
      return await this.trailService.handleRequest(request, path);
    }
    
    // Public Registration Operations - route to the registration service
    if (path.startsWith('/public/registrations')) {
      return await this.registrationService.handleRequest(request, path);
    }
    
    // Trail Operations
    else if (path.startsWith('/trails')) {
      return await this.trailService.handleRequest(request, path);
    }
    // Registration Operations
    else if (path.startsWith('/registrations')) {
      return await this.registrationService.handleRequest(request, path);
    }
    // Template Operations
    else if (path.startsWith('/templates')) {
      return await this.templateService.handleRequest(request, path);
    }
    // Statistics Operations
    else if (path.startsWith('/statistics')) {
      return await this.statisticsService.handleStatisticsRequest(request);
    }
    
    return new Response('Not found', { status: 404 });
  }
  
  // Utility to extract ID from URL path - kept for backward compatibility
  private getIdFromPath(path: string): string | null {
    const parts = path.split('/');
    return parts.length > 2 ? parts[2] : null;
  }

  /**
   * Get access to the statistics service
   * This is needed for triggering statistics operations without using fetch
   */
  getStatisticsService(): StatisticsService {
    return this.statisticsService;
  }
  
  /**
   * Get access to the registration service
   */
  getRegistrationService(): RegistrationService {
    return this.registrationService;
  }
  
  /**
   * Get access to the trail service
   */
  getTrailService(): TrailService {
    return this.trailService;
  }
  
  /**
   * Get access to the template service
   */
  getTemplateService(): TemplateService {
    return this.templateService;
  }
}
