import { supabase } from './supabase'

const API_BASE = '/api'

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession()
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` }),
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const authHeaders = await getAuthHeaders()

  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      ...authHeaders,
      ...options?.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || 'Request failed')
  }

  return response.json()
}

export const api = {
  generate: (data: {
    businessType: string
    content: string
    tone: string
    purpose: string
  }) =>
    apiRequest('/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  checkout: () =>
    apiRequest<{ url: string }>('/stripe/checkout', {
      method: 'POST',
    }),

  searchAddress: (keyword: string) =>
    apiRequest(`/juso?keyword=${encodeURIComponent(keyword)}`),

  // History endpoints
  getHistory: (params: URLSearchParams) =>
    apiRequest<{ data: any[]; hasMore: boolean }>(`/history?${params.toString()}`),

  toggleBookmark: (id: string, isBookmarked: boolean) =>
    apiRequest<{ success: boolean }>('/history/bookmark', {
      method: 'POST',
      body: JSON.stringify({ id, isBookmarked }),
    }),

  deleteHistory: (id: string) =>
    apiRequest<{ success: boolean }>('/history/delete', {
      method: 'POST',
      body: JSON.stringify({ id }),
    }),
}
