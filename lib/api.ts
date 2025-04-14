// lib/api.ts

// Type definitions
export interface Trail {
  id: string;
  name: string;
  description: string;
  location: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
  registrationCount?: number;
  horseCount?: number;  // We'll now get this directly from the server
  notes?: string;
  qrCodeSvg?: string;
  qrCodeBase64?: string;
  length?: number;
  difficulty?: 'easy' | 'moderate' | 'difficult';
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  features?: string[];
}

// New interface for minimal public trail data
export interface PublicTrailInfo {
  id: string;
  name: string;
  description?: string;
  location?: string;
  active: boolean;
}

// New interfaces for analytics data
export interface AnalyticsTimeEntry {
  timeKey: string;     // Could be date, week, or month
  label: string;       // Formatted display label
  totalHorses: number;
  totalRegistrations: number;
  byTrail: Record<string, {
    horseCount: number;
    registrationCount: number;
  }>;
}

export interface AnalyticsData {
  daily: AnalyticsTimeEntry[];
  weekly: AnalyticsTimeEntry[];
  monthly: AnalyticsTimeEntry[];
  byTrail: Record<string, {
    totalHorses: number;
    totalRegistrations: number;
    averageHorsesPerRegistration: number;
  }>;
  lastUpdated: string;
}

export interface Registration {
  id: string;
  trailId: string;
  trailName?: string;
  riderName: string;
  horseCount: number;
  timestamp: string;
  notes?: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  isDefault?: boolean;
}

export interface Statistics {
  totalTrails: number;
  activeTrails: number;
  totalRegistrations: number;
  registrationsByTrail: Record<string, number>;
  registrationsByDate: Record<string, number>;
  generatedAt: string;
}

// New interfaces for paginated registration data
export interface RegistrationTableItem {
  id: string;
  date: string;
  trail: string;
  trailId: string;
  riderName: string;
  horseCount: number;
  timestamp: string;
  formattedDate?: string;
  formattedTimestamp?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  filters?: {
    trail: string | null;
    startDate: string | null;
    endDate: string | null;
  };
}

/**
 * Helper function to handle API responses and errors
 */
async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${errorText}`);
  }
  
  return await response.json() as T;
}

/**
 * Add timestamp to URL to prevent caching
 */
function addCacheBuster(url: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_t=${Date.now()}`;
}

// Trail operations
export async function createTrail(
  data: {
    name: string;
    location: string;
    description?: string;
    notes?: string;
    active?: boolean;
  },
  token: string
): Promise<{ success: boolean }> {
  const res = await fetch("/api/trails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "Cache-Control": "no-cache",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to create trail: ${errorText}`);
  }

  return { success: true };
}

export async function getTrail(trailId: string, token?: string): Promise<Trail> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache, no-store, must-revalidate"
  };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  const url = addCacheBuster(`/api/trails/${trailId}`);
  const res = await fetch(url, {
    headers
  });
  
  return handleApiResponse<Trail>(res);
}

export async function getAllTrails(token?: string): Promise<Trail[]> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0"
  };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  const url = addCacheBuster("/api/trails");
  const res = await fetch(url, {
    headers
  });
  
  return handleApiResponse<Trail[]>(res);
}

export async function updateTrail(
  trailId: string, 
  data: Partial<Trail>, 
  token: string
): Promise<Trail> {
  const res = await fetch(`/api/trails/${trailId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "Cache-Control": "no-cache",
    },
    body: JSON.stringify(data),
  });
  
  return handleApiResponse<Trail>(res);
}

export async function deleteTrail(
  trailId: string, 
  token: string
): Promise<{ success: boolean }> {
  const res = await fetch(`/api/trails/${trailId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Cache-Control": "no-cache",
    }
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to delete trail: ${errorText}`);
  }
  
  return { success: true };
}

// Public trail info - returns only data needed for public registration
export async function getPublicTrailInfo(trailId: string): Promise<PublicTrailInfo> {
  const url = addCacheBuster(`/api/public/trails/${trailId}`);
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate"
    }
  });
  
  return handleApiResponse<PublicTrailInfo>(res);
}

// Template operations
export async function getAllTemplates(token?: string): Promise<Template[]> {
  const headers: HeadersInit = {
    "Content-Type": "application/json"
  };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  const url = addCacheBuster("/api/templates");
  const res = await fetch(url, {
    headers
  });
  
  return handleApiResponse<Template[]>(res);
}

export async function deleteTemplate(
  templateId: string, 
  token: string
): Promise<{ success: boolean }> {
  const res = await fetch(`/api/templates/${templateId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    }
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to delete template: ${errorText}`);
  }
  
  return { success: true };
}

export async function setDefaultTemplate(
  templateId: string, 
  token: string
): Promise<{ success: boolean }> {
  const res = await fetch(`/api/templates/${templateId}/default`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    }
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to set default template: ${errorText}`);
  }
  
  return { success: true };
}

// Statistics operations
export async function getStatistics(token: string): Promise<Statistics> {
  const url = addCacheBuster("/api/statistics");
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    }
  });
  
  return handleApiResponse<Statistics>(res);
}

// New function to get paginated registration data
export async function getRegistrationData(
  token: string,
  page: number = 1,
  limit: number = 10,
  trailFilter?: string,
  startDate?: string,
  endDate?: string
): Promise<PaginatedResponse<RegistrationTableItem>> {
  // Build URL with query parameters
  const url = new URL("/api/statistics/registrations", window.location.origin);
  url.searchParams.set("page", page.toString());
  url.searchParams.set("limit", limit.toString());
  
  if (trailFilter) url.searchParams.set("trail", trailFilter);
  if (startDate) url.searchParams.set("startDate", startDate);
  if (endDate) url.searchParams.set("endDate", endDate);
  
  // Add the user's timezone to ensure consistent date handling
  url.searchParams.set("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
  
  // Add cache busting parameter
  url.searchParams.set("_t", Date.now().toString());
  
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    }
  });
  
  return handleApiResponse<PaginatedResponse<RegistrationTableItem>>(res);
}

// New function to get pre-aggregated analytics data
export async function getAnalyticsData(token: string): Promise<AnalyticsData> {
  const url = addCacheBuster("/api/statistics/analytics");
  console.log("[API] Fetching analytics data from:", url);
  
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }
    });
    
    console.log("[API] Analytics response status:", res.status);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error("[API] Error response:", errorText);
      throw new Error(`API Error: ${errorText}`);
    }
    
    const data = await res.json() as AnalyticsData;
    console.log("[API] Analytics data received, entries:", 
                data?.daily?.length || 0, "daily,", 
                data?.weekly?.length || 0, "weekly,", 
                data?.monthly?.length || 0, "monthly");
    
    // Log first entry for debugging
    if (data?.daily?.[0]) {
      console.log("[API] Sample daily entry:", JSON.stringify(data.daily[0]).substring(0, 300));
    }
    
    return data;
  } catch (error) {
    console.error("[API] Error fetching analytics data:", error);
    throw error;
  }
}

// Registration operations
export async function getTrailRegistrations(
  trailId: string, 
  token: string
): Promise<Registration[]> {
  const url = addCacheBuster(`/api/trails/${trailId}/registrations`);
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Cache-Control": "no-cache, no-store, must-revalidate"
    }
  });
  
  return handleApiResponse<Registration[]>(res);
}

export async function createRegistration(
  data: {
    trailId: string;
    riderName: string;
    horseCount: number;
    notes?: string;
  },
  token?: string
): Promise<Registration> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache"
  };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  const res = await fetch("/api/registrations", {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });
  
  return handleApiResponse<Registration>(res);
}

// Getting horse count for a trail
export async function getTrailHorseCount(
  trailId: string,
  token: string
): Promise<number> {
  const registrations = await getTrailRegistrations(trailId, token);
  return registrations.reduce((total, reg) => total + (reg.horseCount || 0), 0);
}

/**
 * Delete a registration
 */
export async function deleteRegistration(
  registrationId: string,
  token: string
): Promise<{ success: boolean }> {
  const res = await fetch(`/api/registrations/${registrationId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Cache-Control": "no-cache"
    }
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to delete registration: ${errorText}`);
  }
  
  return { success: true };
}

/**
 * Flush all registrations from the system
 */
export async function flushAllRegistrations(token: string): Promise<{ success: boolean }> {
  const res = await fetch('/api/registrations/flush-all', {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Cache-Control': 'no-cache'
    }
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to flush all registrations: ${errorText}`);
  }
  
  return { success: true };
}

// Public registration creation - doesn't require auth token
export async function createPublicRegistration(
  data: {
    trailId: string;
    riderName: string;
    horseCount: number;
    notes?: string;
  }
): Promise<Registration> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache"
  };
  
  const res = await fetch("/api/public/registrations", {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });
  
  return handleApiResponse<Registration>(res);
}

/**
 * Regenerate QR code for a trail with the current origin
 */
export async function regenerateQRCode(
  trailId: string, 
  token?: string
): Promise<Trail> {
  const headers: HeadersInit = { 
    "Content-Type": "application/json",
    "Cache-Control": "no-cache"
  };
  
  // Add authorization if token is provided
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  // Add the X-Forwarded-Origin header with the current origin
  if (typeof window !== 'undefined') {
    headers['X-Forwarded-Origin'] = window.location.origin;
  }
  
  const res = await fetch(`/api/trails/${trailId}/generate-qr`, {
    method: "POST",
    headers
  });
  
  return handleApiResponse<Trail>(res);
}
