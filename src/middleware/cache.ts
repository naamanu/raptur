import { Middleware } from "../types";
import { RapturResponse } from "../response";

export interface CacheOptions {
  /** Time-to-live in seconds. Default `60`. */
  ttl?: number;
  /** Maximum number of entries kept before the oldest is evicted. Default `1000`. */
  max?: number;
  /** Derive the cache key. Default `method + path + query` (query keys sorted). */
  key?: (req: { method: string; path: string; query: Record<string, string> }) => string;
}

interface Entry {
  expires: number;
  status: number;
  body: { kind: "json"; data: unknown } | { kind: "send"; data: string };
}

function defaultKey(r: { method: string; path: string; query: Record<string, string> }): string {
  // Sort query keys so `?a=1&b=2` and `?b=2&a=1` map to the same entry.
  const qs = Object.keys(r.query).sort().map((k) => `${k}=${r.query[k]}`).join("&");
  return `${r.method} ${r.path}?${qs}`;
}

/** Only successful responses are worth replaying. */
function isCacheable(status: number): boolean {
  return status >= 200 && status < 300;
}

/**
 * In-memory response cache. On a hit within `ttl`, the captured response is
 * replayed and the rest of the pipeline is skipped. On a miss, `res.json`/
 * `res.send` are wrapped to capture a *successful* (2xx) terminal payload.
 *
 * The store is bounded: expired entries are dropped on access, and once `max`
 * entries are held the oldest (insertion order) is evicted. Each `cache()` call
 * owns its own store, so different routes don't collide.
 */
export function cache(opts: CacheOptions = {}): Middleware {
  const ttl = (opts.ttl ?? 60) * 1000;
  const max = opts.max ?? 1000;
  const keyOf = opts.key ?? defaultKey;
  const store = new Map<string, Entry>();

  const remember = (key: string, entry: Entry) => {
    store.delete(key); // re-insert so insertion order reflects recency
    store.set(key, entry);
    while (store.size > max) {
      const oldest = store.keys().next().value;
      if (oldest === undefined) break;
      store.delete(oldest);
    }
  };

  return (req, res, next) => {
    const key = keyOf({ method: req.method, path: req.path, query: req.query });
    const hit = store.get(key);

    if (hit) {
      if (hit.expires > Date.now()) {
        res.status(hit.status);
        if (hit.body.kind === "json") res.json(hit.body.data);
        else res.send(hit.body.data);
        return;
      }
      store.delete(key); // expired — evict eagerly
    }

    const target = res as RapturResponse & {
      json: RapturResponse["json"];
      send: RapturResponse["send"];
    };
    const originalJson = target.json.bind(target);
    const originalSend = target.send.bind(target);

    target.json = (data: unknown) => {
      if (!res.sent && isCacheable(res.statusCode)) {
        remember(key, { expires: Date.now() + ttl, status: res.statusCode, body: { kind: "json", data } });
      }
      return originalJson(data);
    };
    target.send = (data: string) => {
      if (!res.sent && isCacheable(res.statusCode)) {
        remember(key, { expires: Date.now() + ttl, status: res.statusCode, body: { kind: "send", data } });
      }
      return originalSend(data);
    };

    return next();
  };
}
