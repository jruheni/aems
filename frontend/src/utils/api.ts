// API Configuration
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'http://localhost:5000'  // Change this to use local backend
  : 'http://localhost:5000';

// Debug the current environment
console.log(`[Debug] Running in ${process.env.NODE_ENV} mode`);
console.log(`[Debug] Using API base URL: ${API_BASE_URL}`);

// Helper function to construct API URLs
export const getApiUrl = (path: string) => {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${API_BASE_URL}/${cleanPath}`;
};

// Helper function for making API requests
export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  // Split endpoint into path and query parameters
  const [path, queryString] = endpoint.split('?');
  
  // Create URL object with base path
  const urlObj = new URL(`${API_BASE_URL}/${path}`);
  
  // Add query parameters if they exist
  if (queryString) {
    const searchParams = new URLSearchParams(queryString);
    Array.from(searchParams).forEach(([key, value]) => {
      urlObj.searchParams.append(key, value);
    });
  }
  
  console.log('[Debug] Making API request to:', urlObj.toString());
  
  try {
    // Set default headers
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Accept': 'application/json',
    };

    // Merge with custom headers
    const headers = {
      ...defaultHeaders,
      ...options.headers,
    };

    const config: RequestInit = {
      ...options,
      credentials: 'include',
      headers,
      mode: 'cors'
    };

    // For POST requests, ensure the method is set
    if (options.body && !options.method) {
      config.method = 'POST';
    }

    console.log('[Debug] Request config:', {
      url: urlObj.toString(),
      method: config.method,
      headers: config.headers,
      credentials: config.credentials,
      mode: config.mode
    });

    const response = await fetch(urlObj.toString(), config);

    console.log('[Debug] Response status:', response.status);
    console.log('[Debug] Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      // Try to parse the error response as JSON
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { 
          error: response.status === 0 
            ? 'Network error: Cannot connect to the backend server. Please ensure it is running locally on port 5000.' 
            : 'API request failed'
        };
      }
      console.log('[Debug] Error response:', errorData);
      
      if (response.status === 0) {
        throw new Error('Network error: Cannot connect to the backend server. Please ensure it is running locally on port 5000.');
      }
      
      throw new Error(errorData.error || 'API request failed');
    }

    const data = await response.json();
    console.log('[Debug] Response data:', data);
    return data;
  } catch (error) {
    console.error('[Debug] API request error:', error);
    throw error;
  }
};

// Helper function for authenticated requests
export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  // Ensure the URL uses the correct base for the current environment
  let fullUrl = url;
  if (!url.startsWith('http')) {
    // If it's a relative URL, prepend the API_BASE_URL
    fullUrl = `${API_BASE_URL}/${url.startsWith('/') ? url.slice(1) : url}`;
  }
  
  console.log('[Debug] Making authenticated request to:', fullUrl);
  console.log('[Debug] Request options:', options);
  
  try {
    const response = await fetch(fullUrl, {
      ...options,
      credentials: 'include',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        ...options.headers,
      },
    });

    console.log('[Debug] Response status:', response.status);
    console.log('[Debug] Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Debug] Authenticated request failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(errorText || 'Authenticated request failed');
    }

    const data = await response.json();
    console.log('[Debug] Response data:', data);
    return data;
  } catch (error) {
    console.error('[Debug] Authenticated request error:', error);
    throw error;
  }
}; 