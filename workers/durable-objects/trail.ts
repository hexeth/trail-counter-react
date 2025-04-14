/**
 * Trail Durable Object for storing and managing trail data
 */

export interface TrailData {
  id: string;
  name: string;
  description: string;
  location: string;
  length: number; // Trail length in miles
  difficulty: 'easy' | 'moderate' | 'difficult';
  createdAt: string;
  updatedAt: string;
  active: boolean;
  qrCodeSvg?: string; // SVG data for QR code
  qrCodeBase64?: string; // Base64 encoded QR code image
  registrationCount?: number; // Count of registrations for this trail
  horseCount?: number; // Total count of horses for this trail
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  features?: string[]; // Special features like "water crossing", "scenic views", etc.
  notes?: string;
}

export class TrailDO {
  state: DurableObjectState;
  
  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
  }
  
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    // Basic CRUD operations
    if (request.method === 'GET') {
      return await this.getTrail();
    } else if (request.method === 'PUT') {
      const data = await request.json() as Partial<TrailData>;
      return await this.updateTrail(data);
    } else if (request.method === 'DELETE') {
      return await this.deleteTrail();
    } else if (request.method === 'POST' && url.pathname.endsWith('/generate-qr')) {
      // Extract origin from request (either from a header or from the request URL)
      const origin = request.headers.get('X-Forwarded-Origin') || url.origin;
      return await this.generateQRCode(origin);
    }
    
    return new Response('Method not allowed', { status: 405 });
  }
  
  async getTrail(): Promise<Response> {
    const data = await this.state.storage.get<TrailData>('data');
    
    if (!data) {
      return new Response('Trail not found', { status: 404 });
    }
    
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  async updateTrail(data: Partial<TrailData>): Promise<Response> {
    // Get existing data, if any
    const existingData = await this.state.storage.get<TrailData>('data');
    
    // If there's no existing data, this is a new trail
    const isNew = !existingData;
    
    // Current timestamp for createdAt/updatedAt
    const now = new Date().toISOString();
    
    // Merge existing data with new data
    const updatedData: TrailData = {
      ...(existingData || {}),
      ...data,
      updatedAt: now,
    } as TrailData;
    
    // If this is a new trail, set createdAt
    if (isNew) {
      updatedData.createdAt = now;
      
      // Set default values if not provided
      if (updatedData.active === undefined) {
        updatedData.active = true;
      }
      
      // Generate QR code for new trails
      await this.generateAndStoreQRCode(updatedData);
    }
    
    // Store the updated data
    await this.state.storage.put('data', updatedData);
    
    return new Response(JSON.stringify(updatedData), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  async deleteTrail(): Promise<Response> {
    const data = await this.state.storage.get<TrailData>('data');
    
    if (!data) {
      return new Response('Trail not found', { status: 404 });
    }
    
    // Actually delete the trail data from storage
    await this.state.storage.delete('data');
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  /**
   * Generate QR code for this trail and store it
   */
  async generateQRCode(origin?: string): Promise<Response> {
    const data = await this.state.storage.get<TrailData>('data');
    
    if (!data) {
      return new Response('Trail not found', { status: 404 });
    }
    
    await this.generateAndStoreQRCode(data, origin);
    
    // Return the updated trail data
    const updatedData = await this.state.storage.get<TrailData>('data');
    return new Response(JSON.stringify(updatedData), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  /**
   * Helper to generate QR code and store it with the trail data
   */
  private async generateAndStoreQRCode(data: TrailData, origin?: string): Promise<void> {
    // The registration URL that the QR code will point to
    // Use the provided origin or fall back to a default if not provided
    const baseUrl = origin || 'https://trail-counter.pages.dev';
    const registrationUrl = `${baseUrl}/register/${data.id}`;
    
    try {
      // Generate QR code using an external API
      const response = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(registrationUrl)}&format=svg`);
      
      if (!response.ok) {
        throw new Error('Failed to generate QR code');
      }
      
      // Get SVG data
      const svgData = await response.text();
      
      // Generate a base64 encoded PNG as well
      const pngResponse = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(registrationUrl)}&format=png`);
      const pngArrayBuffer = await pngResponse.arrayBuffer();
      const pngBase64 = btoa(String.fromCharCode(...new Uint8Array(pngArrayBuffer)));
      
      // Update the trail data with the QR code
      data.qrCodeSvg = svgData;
      data.qrCodeBase64 = `data:image/png;base64,${pngBase64}`;
      
      // Store the updated data
      await this.state.storage.put('data', data);
    } catch (error) {
      console.error('Error generating QR code:', error);
      // Continue without QR code if generation fails
    }
  }
}