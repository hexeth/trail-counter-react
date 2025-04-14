/**
 * Registration Durable Object for storing trail visit registrations
 */

export interface RegistrationData {
  id: string;
  trailId: string;
  trailName?: string;
  riderName: string;
  email?: string;
  timestamp: string;
  horseCount: number;
  comments?: string;
}

export class RegistrationDO {
  state: DurableObjectState;
  
  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
  }
  
  async fetch(request: Request): Promise<Response> {
    // Basic CRUD operations
    if (request.method === 'GET') {
      return await this.getRegistration();
    } else if (request.method === 'PUT') {
      const data = await request.json() as Partial<RegistrationData>;
      return await this.updateRegistration(data);
    } else if (request.method === 'DELETE') {
      return await this.deleteRegistration();
    }
    
    return new Response('Method not allowed', { status: 405 });
  }
  
  async getRegistration(): Promise<Response> {
    const data = await this.state.storage.get<RegistrationData>('data');
    
    if (!data) {
      return new Response('Registration not found', { status: 404 });
    }
    
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  async updateRegistration(data: Partial<RegistrationData>): Promise<Response> {
    // Get existing data, if any
    const existingData = await this.state.storage.get<RegistrationData>('data');
    
    // If there's no existing data, this is a new registration
    const isNew = !existingData;
    
    // For new registrations, ensure we have required fields
    if (isNew) {
      if (!data.trailId || !data.riderName || !data.horseCount) {
        return new Response('Missing required fields', { status: 400 });
      }
      
      // Set timestamp if not provided
      if (!data.timestamp) {
        data.timestamp = new Date().toISOString();
      }
    }
    
    // Merge existing data with new data
    const updatedData: RegistrationData = {
      ...(existingData || {}),
      ...data,
    } as RegistrationData;
    
    // Store the updated data
    await this.state.storage.put('data', updatedData);
    
    return new Response(JSON.stringify(updatedData), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  async deleteRegistration(): Promise<Response> {
    const exists = await this.state.storage.get<RegistrationData>('data');
    
    if (!exists) {
      return new Response('Registration not found', { status: 404 });
    }
    
    // Actually delete the registration
    await this.state.storage.delete('data');
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}