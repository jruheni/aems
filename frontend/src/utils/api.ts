// API Configuration
export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Helper function to construct API URLs
export const getApiUrl = (path: string) => {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  // Add /api prefix if not present
  const apiPath = cleanPath.startsWith('api/') ? cleanPath : `api/${cleanPath}`;
  return `${BASE_URL}/${apiPath}`;
};

// Helper function for making API requests
export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  try {
    const url = `${BASE_URL}/${endpoint}`;
    console.log(`[Debug] Making API request to: ${url}`);
    console.log('[Debug] Request options:', {
      ...options,
      headers: options.headers
    });
    
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      }
    });

    console.log('[Debug] Response status:', response.status);
    console.log('[Debug] Response headers:', Object.fromEntries(response.headers.entries()));

    // For submissions endpoint, don't throw error on 401
    const isSubmissionsEndpoint = endpoint.includes('submissions');
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'API request failed' }));
      console.log('[Debug] Error response:', error);
      
      // Only throw authentication errors if it's a verify auth request
      // or if it's not the submissions endpoint
      if ((endpoint === 'auth/verify' || !isSubmissionsEndpoint) && response.status === 401) {
        throw new Error('Authentication required');
      }
      
      // For submissions endpoint or other errors, just throw the error message
      throw new Error(error.error || 'API request failed');
    }

    const data = await response.json();
    console.log('[Debug] Response data:', data);
    return data;
  } catch (error) {
    console.error('[Debug] API request error:', error);
    throw error;
  }
}

// Helper function for authenticated requests
export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  console.log('Making authenticated request to:', url);
  console.log('Request options:', options);
  
  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Authenticated request failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(errorText || 'Authenticated request failed');
    }

    const data = await response.json();
    console.log('Response data:', data);
    return data;
  } catch (error) {
    console.error('Authenticated request error:', error);
    throw error;
  }
}; 