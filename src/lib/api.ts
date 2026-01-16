const API_BASE = '/api'

export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
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
    apiRequest<{ url: string }>('/checkout', {
      method: 'POST',
    }),

  searchAddress: (keyword: string) =>
    apiRequest(`/juso?keyword=${encodeURIComponent(keyword)}`),
}
