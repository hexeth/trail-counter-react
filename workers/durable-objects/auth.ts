// Import the Env interface from the app.ts file to maintain consistency
interface Env {
  TRAIL_DO: DurableObjectNamespace;
  REGISTRATION_DO: DurableObjectNamespace;
  TEMPLATE_DO: DurableObjectNamespace;
  TRAIL_MANAGER_DO: DurableObjectNamespace;
  AUTH_DO: DurableObjectNamespace;
}

// Auth Durable Object for managing user sessions
export class AuthDO implements DurableObject {
  private state: DurableObjectState;
  private env: Env;
  
  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }
  
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/auth', '');

    if (path === '/login' && request.method === 'POST') {
      return this.handleLogin(request);
    } else if (path === '/verify' && request.method === 'GET') {
      return this.verifySession(request);
    } else if (path === '/logout' && request.method === 'POST') {
      return this.handleLogout(request);
    }

    return new Response('Not found', { status: 404 });
  }

  private async handleLogin(request: Request): Promise<Response> {
    const data = await request.json() as { email: string; password: string };
    const { email, password } = data;
    
    console.log("Login attempt for:", email);
    
    // In production, you'd validate against stored credentials with proper hashing
    // For this example, we're using hardcoded values
    if (email === 'admin@example.com' && password === 'password') {
      // Create a session token
      const sessionId = crypto.randomUUID();
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours from now
      
      console.log("Creating session with ID:", sessionId);
      
      // Store the session in Durable Object storage
      await this.state.storage.put(`session:${sessionId}`, {
        userId: '1', 
        email,
        expiresAt
      });
      
      // For development debugging, create a specific cookie format that works with localhost
      // This is ONLY for local development and should be properly secured in production
      const url = new URL(request.url);
      const isLocalDev = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
      
      let cookieOptions;
      
      if (isLocalDev) {
        cookieOptions = `sessionId=${sessionId}; Path=/; Max-Age=86400`;
        console.log("Setting development cookie:", cookieOptions);
      } else {
        cookieOptions = `sessionId=${sessionId}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`;
        console.log("Setting production cookie:", cookieOptions);
      }
      
      return new Response(JSON.stringify({ 
        success: true,
        // Include session ID in response for client-side cookie setting in dev mode
        sessionId: isLocalDev ? sessionId : undefined 
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': cookieOptions
        }
      });
    }
    
    console.log("Login failed: invalid credentials");
    return new Response(JSON.stringify({ success: false, error: 'Invalid credentials' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private async verifySession(request: Request): Promise<Response> {
    const cookies = request.headers.get('Cookie') || '';
    const sessionId = this.getSessionIdFromCookies(cookies);
    
    if (!sessionId) {
      return new Response(JSON.stringify({ authenticated: false }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const session = await this.state.storage.get(`session:${sessionId}`) as { userId: string, email: string, expiresAt: number } | undefined;
    
    if (!session || session.expiresAt < Date.now()) {
      // Session expired or not found
      return new Response(JSON.stringify({ authenticated: false }), {
        status: 401,
        headers: { 
          'Content-Type': 'application/json',
          // Clear the invalid cookie
          'Set-Cookie': 'sessionId=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'
        }
      });
    }
    
    // Session is valid
    return new Response(JSON.stringify({ 
      authenticated: true,
      user: {
        email: session.email,
        userId: session.userId
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private async handleLogout(request: Request): Promise<Response> {
    const cookies = request.headers.get('Cookie') || '';
    const sessionId = this.getSessionIdFromCookies(cookies);
    
    if (sessionId) {
      // Remove the session from storage
      await this.state.storage.delete(`session:${sessionId}`);
    }
    
    // Clear the session cookie
    return new Response(JSON.stringify({ success: true }), {
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': 'sessionId=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'
      }
    });
  }

  private getSessionIdFromCookies(cookies: string): string | null {
    const match = cookies.match(/sessionId=([^;]+)/);
    return match ? match[1] : null;
  }
}