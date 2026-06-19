import { Middleware } from "../types";
import { RapturResponse } from "../response";

export interface CacheOptions {
  /** Time-to-live in seconds. Default `60`. */
  ttl?: number;
  /** Derive the cache key. Default `method + path + query`. */
  key?: (req: { method: string; path: string; query: Record<string, string> }) => string;
}

interface Entry {
  expires: number;
  status: number;
  body: { kind: "json"; data: unknown } | { kind: "send"; data: string };
}

/**
 * In-memory response cache. On a hit within `ttl`, the captured response is
 * replayed and the rest of the pipeline is skipped. On a miss, `res.json`/
 * `res.send` are wrapped to capture the terminal payload for next time.
 *
 * Each `cache()` call owns its own store, so different routes don't collide.
 */
export function cache(opts: CacheOptions = {}): Middleware {
  const ttl = (opts.ttl ?? 60) * 1000;
  const keyOf = opts.key ?? ((r) => `${r.method} ${r.path}?${new URLSearchParams(r.query)}`);
  const store = new Map<string, Entry>();

  return (req, res, next) => {
    const key = keyOf({ method: req.method, path: req.path, query: req.query });
    const hit = store.get(key);

    if (hit && hit.expires > Date.now()) {
      res.status(hit.status);
      if (hit.body.kind === "json") res.json(hit.body.data);
      else res.send(hit.body.data);
      return;
    }

    const target = res as RapturResponse & {
      json: RapturResponse["json"];
      send: RapturResponse["send"];
    };
    const originalJson = target.json.bind(target);
    const originalSend = target.send.bind(target);

    target.json = (data: unknown) => {
      if (!res.sent) {
        store.set(key, { expires: Date.now() + ttl, status: res.statusCode, body: { kind: "json", data } });
      }
      return originalJson(data);
    };
    target.send = (data: string) => {
      if (!res.sent) {
        store.set(key, { expires: Date.now() + ttl, status: res.statusCode, body: { kind: "send", data } });
      }
      return originalSend(data);
    };

    return next();
  };
}
