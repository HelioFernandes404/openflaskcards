import { performBlobRequest, performRequest } from './apiClientCore'
import type { InternalHttpRequestConfig } from './apiClientConstants'
import type {
  HttpClient,
  HttpMethod,
  HttpRequestConfig,
  HttpResponse,
} from './httpTypes'

class ApiClient implements HttpClient {
  private async request<T>(
    method: HttpMethod,
    url: string,
    config: InternalHttpRequestConfig = {},
  ): Promise<HttpResponse<T>> {
    return performRequest<T>(method, url, config)
  }

  get<T>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>('GET', url, config)
  }

  getBlob(
    url: string,
    config?: HttpRequestConfig,
  ): Promise<HttpResponse<Blob>> {
    return performBlobRequest(url, config)
  }

  post<T>(
    url: string,
    data?: unknown,
    config?: HttpRequestConfig,
  ): Promise<HttpResponse<T>> {
    return this.request<T>('POST', url, {
      ...config,
      body: data,
    })
  }

  put<T>(
    url: string,
    data?: unknown,
    config?: HttpRequestConfig,
  ): Promise<HttpResponse<T>> {
    return this.request<T>('PUT', url, {
      ...config,
      body: data,
    })
  }

  patch<T>(
    url: string,
    data?: unknown,
    config?: HttpRequestConfig,
  ): Promise<HttpResponse<T>> {
    return this.request<T>('PATCH', url, {
      ...config,
      body: data,
    })
  }

  delete<T>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>('DELETE', url, config)
  }

  getClient(): HttpClient {
    return this
  }
}

export const apiClient = new ApiClient()
export const httpClient = apiClient.getClient()
