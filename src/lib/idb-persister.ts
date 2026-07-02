import { get, set, del } from 'idb-keyval'
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client'

export function createIDBPersister(idbValidKey: IDBValidKey = 'reactQuery'): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      if (typeof window !== "undefined") {
        await set(idbValidKey, client)
      }
    },
    restoreClient: async () => {
      if (typeof window !== "undefined") {
        return await get<PersistedClient>(idbValidKey)
      }
      return undefined
    },
    removeClient: async () => {
      if (typeof window !== "undefined") {
        await del(idbValidKey)
      }
    },
  }
}
