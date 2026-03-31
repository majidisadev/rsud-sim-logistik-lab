import type { SWRConfiguration } from 'swr'
import api from './api'

export async function swrFetcher<T>(key: string | [string, Record<string, unknown>]): Promise<T> {
  if (Array.isArray(key)) {
    const [url, params] = key
    const res = await api.get(url, { params })
    return res.data as T
  }

  const res = await api.get(key)
  return res.data as T
}

export const swrConfig: SWRConfiguration = {
  fetcher: swrFetcher,
  revalidateOnFocus: false,
  dedupingInterval: 2_000,
}

