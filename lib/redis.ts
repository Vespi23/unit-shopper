import { createClient, RedisClientType } from 'redis';

// Use a global variable to preserve the client across module reloads in development
const globalForRedis = global as unknown as { redis: RedisClientType | undefined };

const REDIS_URL = process.env.REDIS_URL || process.env.KV_URL;

export const redis =
    globalForRedis.redis ??
    createClient({
        url: REDIS_URL,
    });

if (process.env.NODE_ENV !== 'production') {
    globalForRedis.redis = redis as RedisClientType;
}

// Handle connection errors gracefully
redis.on('error', (err) => console.error('Redis Client Error', err));

// Connect if not already connected and URL is present
if (REDIS_URL && !redis.isOpen) {
    redis.connect().catch((err) => console.error('Redis Connection Error', err));
}

/**
 * Retrieve preferences for a given key.
 * Expected to be stored as a JSON string or hash.
 * This implementation assumes simple string storage for now.
 */
export async function getPrefs(key: string): Promise<Record<string, string>> {
    try {
        if (!REDIS_URL) return {};
        // We let the client queue commands if not yet connected
        const data = await redis.get(key);
        return data ? JSON.parse(data) : {};
    } catch (error) {
        console.error(`Error getting prefs for key ${key}:`, error);
        return {};
    }
}

/**
 * Update preferences for a given key.
 * Merges with existing preferences if needed, or overwrites.
 * This implementation overwrites for simplicity as per request.
 */
export async function updatePrefs(key: string, prefs: Record<string, string>) {
    try {
        if (!REDIS_URL) return;
        // We let the client queue commands if not yet connected
        await redis.set(key, JSON.stringify(prefs));
    } catch (error) {
        console.error(`Error updating prefs for key ${key}:`, error);
    }
}
