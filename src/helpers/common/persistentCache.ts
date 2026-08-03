type PersistentCacheEntry<T> = {
	expiresAt: number
	value: T
}

const pendingRequests = new Map<string, Promise<unknown>>()

function canUseLocalStorage() {
	return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readCacheEntry<T>(key: string): T | null {
	if (!canUseLocalStorage()) return null

	try {
		const rawValue = window.localStorage.getItem(key)
		if (!rawValue) return null

		const parsedValue = JSON.parse(rawValue) as PersistentCacheEntry<T>
		if (!parsedValue || typeof parsedValue.expiresAt !== 'number') return null
		if (Date.now() > parsedValue.expiresAt) {
			window.localStorage.removeItem(key)
			return null
		}

		return parsedValue.value ?? null
	} catch {
		return null
	}
}

export function getPersistentCacheValue<T>(key: string) {
	return readCacheEntry<T>(key)
}

function writeCacheEntry<T>(key: string, value: T, ttlMs: number) {
	if (!canUseLocalStorage()) return

	try {
		const entry: PersistentCacheEntry<T> = {
			expiresAt: Date.now() + ttlMs,
			value,
		}
		window.localStorage.setItem(key, JSON.stringify(entry))
	} catch {
		// Ignore storage failures such as quota limits or disabled storage.
	}
}

export async function getOrSetPersistentCache<T>(key: string, ttlMs: number, loader: () => Promise<T>) {
	const cachedValue = readCacheEntry<T>(key)
	if (cachedValue !== null) return cachedValue

	const pendingRequest = pendingRequests.get(key)
	if (pendingRequest) {
		return pendingRequest as Promise<T>
	}

	const request = loader()
		.then((value) => {
			writeCacheEntry(key, value, ttlMs)
			return value
		})
		.finally(() => {
			pendingRequests.delete(key)
		})

	pendingRequests.set(key, request)
	return request
}
