import { Middleware } from "../types";

export interface AuthOptions {
  /** Header to read the credential from. Default `authorization`. */
  header?: string;
  /** Strip this scheme prefix from the header value. Default `Bearer`. */
  scheme?: string;
  /** A fixed token to match, or a predicate to validate the credential. */
  token?: string;
  verify?: (token: string) => boolean | Promise<boolean>;
}

/**
 * Reject requests without a valid credential with `401`. Supply either a fixed
 * `token` or a `verify` predicate. On success the request continues down the
 * pipeline via `next()`; with neither option set, any present credential passes.
 */
export function auth(opts: AuthOptions = {}): Middleware {
  const headerName = (opts.header ?? "authorization").toLowerCase();
  const scheme = opts.scheme ?? "Bearer";

  return async (req, res, next) => {
    const raw = req.headers[headerName];
    const value = Array.isArray(raw) ? raw[0] : raw;

    if (!value) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const token = scheme && value.startsWith(`${scheme} `)
      ? value.slice(scheme.length + 1)
      : value;

    const ok = opts.verify
      ? await opts.verify(token)
      : opts.token !== undefined
        ? token === opts.token
        : true;

    if (!ok) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    return next();
  };
}
