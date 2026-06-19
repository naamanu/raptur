import { Middleware } from "../types";
import { BodyError } from "../errors";

export interface JsonMiddlewareOptions {
  /** Maximum body size in bytes before a `413` is sent. Default 1 MiB. */
  limit?: number;
}

/**
 * Eagerly parse a JSON request body into `req.body` before the rest of the
 * pipeline runs. A malformed body short-circuits with `400` and an oversized
 * body with `413`, so downstream middleware (e.g. `validate`) can rely on
 * `req.body` being present and well-formed.
 */
export function json(opts: JsonMiddlewareOptions = {}): Middleware {
  return async (req, res, next) => {
    try {
      await req.json({ limit: opts.limit });
    } catch (err) {
      if (err instanceof BodyError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      throw err;
    }
    return next();
  };
}
