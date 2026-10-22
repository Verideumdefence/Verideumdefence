const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  'https://verideumdefence-backend.onrender.com'
).replace(/\/+$/, '');
console.log('[API DEBUG] VITE_API_URL:', import.meta.env.VITE_API_URL);
console.log('[API DEBUG] API_BASE_URL:', API_BASE_URL);
const getAuthHeaders = (skipAuth = false) => {
  const token = localStorage.getItem('access_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (!skipAuth && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (response: Response) => {
  if (response.status === 204) return undefined;
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    const detail = error && typeof error === 'object' && 'detail' in error
      ? String(error.detail)
      : 'The server could not complete your request. Please try again.';
    throw new Error(detail);
  }
  return response.json();
};

export const api = {
  get: async (endpoint: string, skipAuth = false) => {
    const response = await fetch(`${API_BASE_URL}/api/v1${endpoint}`, {
      method: 'GET',
      headers: getAuthHeaders(skipAuth),
    });
    return handleResponse(response);
  },

  post: async (endpoint: string, data: unknown, skipAuth = false) => {
    const response = await fetch(`${API_BASE_URL}/api/v1${endpoint}`, {
      method: 'POST',
      headers: getAuthHeaders(skipAuth),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  put: async (endpoint: string, data: unknown, skipAuth = false) => {
    const response = await fetch(`${API_BASE_URL}/api/v1${endpoint}`, {
      method: 'PUT',
      headers: getAuthHeaders(skipAuth),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  patch: async (endpoint: string, data: unknown, skipAuth = false) => {
    const response = await fetch(`${API_BASE_URL}/api/v1${endpoint}`, {
      method: 'PATCH',
      headers: getAuthHeaders(skipAuth),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  delete: async (endpoint: string, skipAuth = false) => {
    const response = await fetch(`${API_BASE_URL}/api/v1${endpoint}`, {
      method: 'DELETE',
      headers: getAuthHeaders(skipAuth),
    });
    return handleResponse(response);
  },
};

export const auth = {
  login: async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    const data = await handleResponse(response);
    if (data.access_token) {
      localStorage.setItem('access_token', data.access_token);
    }
    return data;
  },

  logout: () => {
    localStorage.removeItem('access_token');
  },

  getCurrentUser: async () => {
    return api.get('/auth/me');
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('access_token');
  },
};
