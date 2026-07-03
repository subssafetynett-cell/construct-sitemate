let client = null;
let connectPromise = null;

function getRedisUrl() {
  return process.env.REDIS_URL || process.env.REDIS_HOST || "";
}

function isRedisConfigured() {
  return Boolean(getRedisUrl());
}

async function getRedisClient() {
  if (!isRedisConfigured()) return null;
  if (client) return client;
  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    try {
      const { createClient } = require("redis");
      const url = process.env.REDIS_URL;
      const next = url
        ? createClient({ url })
        : createClient({
            socket: {
              host: process.env.REDIS_HOST || "redis",
              port: Number(process.env.REDIS_PORT || 6379),
            },
            password: process.env.REDIS_PASSWORD || undefined,
          });

      next.on("error", (err) => {
        console.error("[redis] Client error:", err.message);
      });

      await next.connect();
      client = next;
      console.log("[redis] Connected — dashboard cache enabled");
      return client;
    } catch (err) {
      console.warn("[redis] Unavailable — continuing without cache:", err.message);
      connectPromise = null;
      return null;
    }
  })();

  return connectPromise;
}

async function cacheGet(key) {
  const redis = await getRedisClient();
  if (!redis) return null;
  try {
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn("[redis] cacheGet failed:", err.message);
    return null;
  }
}

async function cacheSet(key, value, ttlSeconds = 60) {
  const redis = await getRedisClient();
  if (!redis) return false;
  try {
    await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
    return true;
  } catch (err) {
    console.warn("[redis] cacheSet failed:", err.message);
    return false;
  }
}

async function withCache(key, ttlSeconds, compute) {
  const hit = await cacheGet(key);
  if (hit != null) {
    return { value: hit, cached: true };
  }
  const value = await compute();
  await cacheSet(key, value, ttlSeconds);
  return { value, cached: false };
}

async function closeRedis() {
  if (client) {
    try {
      await client.quit();
    } catch {
      /* ignore */
    }
    client = null;
    connectPromise = null;
  }
}

module.exports = {
  isRedisConfigured,
  getRedisClient,
  cacheGet,
  cacheSet,
  withCache,
  closeRedis,
};
