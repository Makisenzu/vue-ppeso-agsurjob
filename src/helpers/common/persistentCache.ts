type PersistentCacheEntry<T> = {
	expiresAt: number
	value: T
}

const pendingRequests = new Map<string, Promise<unknown>>()

// Only public reference data (PSGC geography) may be written to localStorage.
// Everything else can contain personal data, so it lives in memory only and is
// wiped on sign-out or page reload — localStorage survives across users on shared PCs.
const LOCAL_STORAGE_KEY_PREFIXES = ['psgc:', 'geographic-map:agusan-del-sur-municipality-barangay-counts']

// Keys previously written to localStorage that held personal data; purged on load.
const LEGACY_SENSITIVE_KEY_PREFIXES = ['peso:', 'admin:', 'geographic-map:profiles', 'geographic:municipality:', 'document-templates:']

const memoryCache = new Map<string, PersistentCacheEntry<unknown>>()
// Bumped on clear so requests still in flight from the previous session don't repopulate the cache.
let cacheGeneration = 0

function canUseLocalStorage() {
	return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function isLocalStorageKey(key: string) {
	return LOCAL_STORAGE_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))
}

function readCacheEntry<T>(key: string): T | null {
	if (!isLocalStorageKey(key)) {
		const entry = memoryCache.get(key) as PersistentCacheEntry<T> | undefined
		if (!entry) return null
		if (Date.now() > entry.expiresAt) {
			memoryCache.delete(key)
			return null
		}
		return entry.value ?? null
	}

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

export function removePersistentCacheValue(key: string) {
	memoryCache.delete(key)

	if (!canUseLocalStorage()) return

	try {
		window.localStorage.removeItem(key)
	} catch {
		// Ignore storage failures.
	}
}

export function setPersistentCacheValue<T>(key: string, value: T, ttlMs: number) {
	writeCacheEntry(key, value, ttlMs)
}

function writeCacheEntry<T>(key: string, value: T, ttlMs: number) {
	const entry: PersistentCacheEntry<T> = {
		expiresAt: Date.now() + ttlMs,
		value,
	}

	if (!isLocalStorageKey(key)) {
		memoryCache.set(key, entry)
		return
	}

	if (!canUseLocalStorage()) return

	try {
		window.localStorage.setItem(key, JSON.stringify(entry))
	} catch {
		// Ignore storage failures such as quota limits or disabled storage.
	}
}

/**
 * Drops every user-scoped cache entry. Call on sign-out so the next person
 * on the same browser never sees the previous user's data.
 */
export function clearUserScopedCache() {
	cacheGeneration++
	memoryCache.clear()
	pendingRequests.clear()
	purgeLegacySensitiveEntries()
}

function purgeLegacySensitiveEntries() {
	if (!canUseLocalStorage()) return

	try {
		const keysToRemove: string[] = []
		for (let index = 0; index < window.localStorage.length; index++) {
			const key = window.localStorage.key(index)
			if (key && LEGACY_SENSITIVE_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))) {
				keysToRemove.push(key)
			}
		}
		keysToRemove.forEach((key) => window.localStorage.removeItem(key))
	} catch {
		// Ignore storage failures.
	}
}

// Clean up personal data left behind by older builds that cached it in localStorage.
purgeLegacySensitiveEntries()

export async function getOrSetPersistentCache<T>(key: string, ttlMs: number, loader: () => Promise<T>) {
	const cachedValue = readCacheEntry<T>(key)
	if (cachedValue !== null) return cachedValue

	const pendingRequest = pendingRequests.get(key)
	if (pendingRequest) {
		return pendingRequest as Promise<T>
	}

	const generation = cacheGeneration
	const request = loader()
		.then((value) => {
			if (generation === cacheGeneration) {
				writeCacheEntry(key, value, ttlMs)
			}
			return value
		})
		.finally(() => {
			if (pendingRequests.get(key) === request) {
				pendingRequests.delete(key)
			}
		})

	pendingRequests.set(key, request)
	return request
}
