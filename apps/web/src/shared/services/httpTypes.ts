export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface HttpRequestConfig
  extends Omit<RequestInit, 'body' | 'method' | 'headers'> {
  headers?: Record<string, string>
  params?: Record<string, string | number | boolean | undefined>
}

export interface HttpResponse<T = unknown> {
  data: T
  status: number
  headers: Headers
}

export interface HttpClient {
  get<T>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>>
  getBlob(url: string, config?: HttpRequestConfig): Promise<HttpResponse<Blob>>
  post<T>(
    url: string,
    data?: unknown,
    config?: HttpRequestConfig,
  ): Promise<HttpResponse<T>>
  put<T>(
    url: string,
    data?: unknown,
    config?: HttpRequestConfig,
  ): Promise<HttpResponse<T>>
  patch<T>(
    url: string,
    data?: unknown,
    config?: HttpRequestConfig,
  ): Promise<HttpResponse<T>>
  delete<T>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>>
}
