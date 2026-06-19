import { Middleware } from "../types";

export interface CorsOptions {
  /** Value for `Access-Control-Allow-Origin`. Default `*`. */
  origin?: string;
  /** Allowed methods. Default `GET, POST, PUT, DELETE, OPTIONS`. */
  methods?: string[];
  /** Allowed request headers. Default `Content-Type, Authorization`. */
  headers?: string[];
}

/**
 * Set CORS headers on every response and short-circuit preflight `OPTIONS`
 * requests with a `204`.
 */
export function cors(opts: CorsOptions = {}): Middleware {
  const origin = opts.origin ?? "*";
  const methods = (opts.methods ?? ["GET", "POST", "PUT", "DELETE", "OPTIONS"]).join(", ");
  const headers = (opts.headers ?? ["Content-Type", "Authorization"]).join(", ");

  return (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", methods);
    res.setHeader("Access-Control-Allow-Headers", headers);

    if ((req.headers["access-control-request-method"] || req.method === "OPTIONS")) {
      res.status(204).send("");
      return;
    }

    return next();
  };
}
