import type { TemplateData } from '../durable-objects/template';
import { TrailManagerDO } from '../durable-objects/trail-manager';

/**
 * Service to handle all template-related operations
 */
export class TemplateService {
  state: DurableObjectState;
  env: Env;
  manager: TrailManagerDO;
  
  constructor(state: DurableObjectState, env: Env, manager: TrailManagerDO) {
    this.state = state;
    this.env = env;
    this.manager = manager;
  }
  
  async handleRequest(request: Request, path: string): Promise<Response> {
    // Get all templates
    if (path === '/templates' && request.method === 'GET') {
      return await this.getAllTemplates();
    }
    
    // Create a new template
    if (path === '/templates' && request.method === 'POST') {
      const data = await request.json() as Partial<TemplateData>;
      return await this.createTemplate(data);
    }
    
    // Operations on a specific template
    const templateId = this.getIdFromPath(path);
    if (!templateId) {
      return new Response('Template ID required', { status: 400 });
    }
    
    // Get specific template
    if (path === `/templates/${templateId}` && request.method === 'GET') {
      return await this.getTemplate(templateId);
    }
    
    // Update specific template
    if (path === `/templates/${templateId}` && request.method === 'PUT') {
      const data = await request.json() as Partial<TemplateData>;
      return await this.updateTemplate(templateId, data);
    }
    
    // Delete specific template
    if (path === `/templates/${templateId}` && request.method === 'DELETE') {
      return await this.deleteTemplate(templateId);
    }
    
    return new Response('Not found', { status: 404 });
  }
  
  // Utility to extract ID from URL path
  private getIdFromPath(path: string): string | null {
    const parts = path.split('/');
    return parts.length > 2 ? parts[2] : null;
  }
  
  async getAllTemplates(): Promise<Response> {
    // Try to get from cache first
    const cacheKey = 'all-templates';
    const cachedTemplates = this.manager.getFromCache<TemplateData[]>(cacheKey);
    
    if (cachedTemplates) {
      console.log('[TemplateService] Returning cached templates data');
      return new Response(JSON.stringify(cachedTemplates), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('[TemplateService] Cache miss for templates data, fetching from storage');
    
    // Get all template IDs stored in the manager
    const templateIds = await this.state.storage.list<string>({ prefix: 'template:' });
    
    // Fetch each template's data from its Durable Object
    const templates: TemplateData[] = [];
    
    // Process in batches for better performance
    const batchSize = 10;
    const batches = [];
    
    let currentBatch: [string, string][] = [];
    for (const entry of templateIds) {
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
        const templateId = key.substring(9); // Remove 'template:' prefix
        try {
          // Safely get the Durable Object
          let templateDO;
          try {
            templateDO = this.env.TEMPLATE_DO.get(
              this.env.TEMPLATE_DO.idFromString(id)
            );
          } catch (error) {
            console.error(`Invalid Durable Object ID for template ${templateId}: ${id}`);
            return null;
          }
          
          const response = await templateDO.fetch('https://dummy-url/');
          if (response.status === 200) {
            return await response.json() as TemplateData;
          }
        } catch (error) {
          console.error(`Error fetching template ${templateId}:`, error);
        }
        return null;
      });
      
      // Wait for the batch to complete
      const batchResults = await Promise.all(batchPromises);
      templates.push(...batchResults.filter(template => template !== null) as TemplateData[]);
    }
    
    // Cache the results
    this.manager.setInCache(cacheKey, templates, 5 * 60 * 1000); // 5 minutes TTL since templates change less frequently
    
    return new Response(JSON.stringify(templates), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  async createTemplate(data: Partial<TemplateData>): Promise<Response> {
    // Generate a unique ID for the new template
    const templateId = crypto.randomUUID();
    
    // Create a new Durable Object for this template
    const templateObjectId = this.env.TEMPLATE_DO.newUniqueId();
    const templateObject = this.env.TEMPLATE_DO.get(templateObjectId);
    
    // Store the mapping between template ID and Durable Object ID
    await this.state.storage.put(`template:${templateId}`, templateObjectId.toString());
    
    // Set the ID in the template data
    data.id = templateId;
    
    // Initialize the template data in the Durable Object
    const response = await templateObject.fetch('https://dummy-url/', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    
    // Invalidate cache on successful creation
    if (response.status === 200) {
      this.manager.invalidateCache('all-templates');
    }
    
    return response;
  }
  
  async getTemplate(templateId: string): Promise<Response> {
    // Check cache first
    const cacheKey = `template:${templateId}`;
    const cachedTemplate = this.manager.getFromCache<TemplateData>(cacheKey);
    
    if (cachedTemplate) {
      console.log(`[TemplateService] Returning cached template: ${templateId}`);
      return new Response(JSON.stringify(cachedTemplate), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Get the Durable Object ID for this template
    const templateObjectId = await this.state.storage.get<string>(`template:${templateId}`);
    
    if (!templateObjectId) {
      return new Response('Template not found', { status: 404 });
    }
    
    // Get the template data from its Durable Object
    const templateObject = this.env.TEMPLATE_DO.get(
      this.env.TEMPLATE_DO.idFromString(templateObjectId)
    );
    
    const response = await templateObject.fetch('https://dummy-url/');
    
    if (response.status === 200) {
      const data = await response.json();
      // Cache the result
      this.manager.setInCache(cacheKey, data, 10 * 60 * 1000); // 10 minute TTL since templates rarely change
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return response;
  }
  
  async updateTemplate(templateId: string, data: Partial<TemplateData>): Promise<Response> {
    // Get the Durable Object ID for this template
    const templateObjectId = await this.state.storage.get<string>(`template:${templateId}`);
    
    if (!templateObjectId) {
      return new Response('Template not found', { status: 404 });
    }
    
    // Update the template data in its Durable Object
    const templateObject = this.env.TEMPLATE_DO.get(
      this.env.TEMPLATE_DO.idFromString(templateObjectId)
    );
    
    const response = await templateObject.fetch('https://dummy-url/', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    
    // Invalidate caches on successful update
    if (response.status === 200) {
      this.manager.invalidateCache('all-templates');
      this.manager.invalidateCache(`template:${templateId}`);
    }
    
    return response;
  }
  
  async deleteTemplate(templateId: string): Promise<Response> {
    // Get the Durable Object ID for this template
    const templateObjectId = await this.state.storage.get<string>(`template:${templateId}`);
    
    if (!templateObjectId) {
      return new Response('Template not found', { status: 404 });
    }
    
    // Delete the template mapping
    await this.state.storage.delete(`template:${templateId}`);
    
    // Delete the template in its Durable Object
    const templateObject = this.env.TEMPLATE_DO.get(
      this.env.TEMPLATE_DO.idFromString(templateObjectId)
    );
    
    const response = await templateObject.fetch('https://dummy-url/', {
      method: 'DELETE'
    });
    
    // Invalidate caches on successful deletion
    if (response.status === 200) {
      this.manager.invalidateCache('all-templates');
      this.manager.invalidateCache(`template:${templateId}`);
    }
    
    return response;
  }
}