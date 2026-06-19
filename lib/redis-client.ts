export const runtime = "nodejs";

const url = process.env.UPSTASH_REDIS_REST_URL || "";
const token = process.env.UPSTASH_REDIS_REST_TOKEN || "";

/**
 * Native REST Client to completely circumvent SDK telemetry pipeline injection crashes
 */
export const redisREST = {
  async set(key: string, value: any, options?: { ex: number }) {
    if (!url || !token) return null;
    try {
      const bodyArgs = ["SET", key, typeof value === "string" ? value : JSON.stringify(value)];
      if (options?.ex) {
        bodyArgs.push("EX", options.ex.toString());
      }
      const res = await fetch(`${url}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(bodyArgs),
      });
      return res.ok ? await res.json() : null;
    } catch (_) { return null; }
  },

  async get(key: string): Promise<any> {
    if (!url || !token) return null;
    try {
      const res = await fetch(`${url}/get/${key}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.result;
    } catch (_) { return null; }
  },

  async srem(key: string, member: string) {
    if (!url || !token) return null;
    try {
      const res = await fetch(`${url}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(["SREM", key, member]),
      });
      return res.ok ? await res.json() : null;
    } catch (_) { return null; }
  },

  async scard(key: string): Promise<number> {
    if (!url || !token) return 0;
    try {
      const res = await fetch(`${url}/scard/${key}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return 0;
      const data = await res.json();
      return parseInt(data.result || "0", 10);
    } catch (_) { return 0; }
  },

  async sadd(key: string, ...members: string[]) {
    if (!url || !token) return null;
    try {
      const res = await fetch(`${url}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(["SADD", key, ...members]),
      });
      return res.ok ? await res.json() : null;
    } catch (_) { return null; }
  },

  async expire(key: string, seconds: number) {
    if (!url || !token) return null;
    try {
      const res = await fetch(`${url}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(["EXPIRE", key, seconds.toString()]),
      });
      return res.ok ? await res.json() : null;
    } catch (_) { return null; }
  }
};