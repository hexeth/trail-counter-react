/**
 * Template Durable Object for managing QR code print templates
 */

export interface TemplateData {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  layout: {
    logoPosition?: 'top' | 'bottom' | 'left' | 'right' | 'none';
    qrSize?: 'small' | 'medium' | 'large';
    includeTrailName: boolean;
    includeDescription: boolean;
    includeInstructions: boolean;
    customCss?: string;
    customHtml?: string;
  };
}

export class TemplateDO {
  state: DurableObjectState;
  
  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
  }
  
  async fetch(request: Request): Promise<Response> {
    // Basic CRUD operations
    if (request.method === 'GET') {
      return await this.getTemplate();
    } else if (request.method === 'PUT') {
      const data = await request.json() as Partial<TemplateData>;
      return await this.updateTemplate(data);
    } else if (request.method === 'DELETE') {
      return await this.deleteTemplate();
    } else if (request.method === 'POST') {
      const url = new URL(request.url);
      if (url.pathname.endsWith('/setDefault')) {
        return await this.setAsDefault();
      }
    }
    
    return new Response('Method not allowed', { status: 405 });
  }
  
  async getTemplate(): Promise<Response> {
    const data = await this.state.storage.get<TemplateData>('data');
    
    if (!data) {
      return new Response('Template not found', { status: 404 });
    }
    
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  async updateTemplate(data: Partial<TemplateData>): Promise<Response> {
    // Get existing data, if any
    const existingData = await this.state.storage.get<TemplateData>('data');
    
    // If there's no existing data, this is a new template
    const isNew = !existingData;
    
    // Current timestamp for createdAt/updatedAt
    const now = new Date().toISOString();
    
    // Merge existing data with new data
    const updatedData: TemplateData = {
      ...(existingData || {}),
      ...data,
      updatedAt: now,
    } as TemplateData;
    
    // If this is a new template, set default values
    if (isNew) {
      updatedData.createdAt = now;
      
      // Set default values if not provided
      if (updatedData.isDefault === undefined) {
        updatedData.isDefault = false;
      }
      
      // Set default layout if not provided
      if (!updatedData.layout) {
        updatedData.layout = {
          logoPosition: 'top',
          qrSize: 'medium',
          includeTrailName: true,
          includeDescription: true,
          includeInstructions: true
        };
      }
    }
    
    // Store the updated data
    await this.state.storage.put('data', updatedData);
    
    return new Response(JSON.stringify(updatedData), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  async deleteTemplate(): Promise<Response> {
    const data = await this.state.storage.get<TemplateData>('data');
    
    if (!data) {
      return new Response('Template not found', { status: 404 });
    }
    
    // Don't allow deletion of default template
    if (data.isDefault) {
      return new Response('Cannot delete default template', { status: 400 });
    }
    
    // Delete the template
    await this.state.storage.delete('data');
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  async setAsDefault(): Promise<Response> {
    const data = await this.state.storage.get<TemplateData>('data');
    
    if (!data) {
      return new Response('Template not found', { status: 404 });
    }
    
    // Update template to be default
    data.isDefault = true;
    data.updatedAt = new Date().toISOString();
    
    await this.state.storage.put('data', data);
    
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}