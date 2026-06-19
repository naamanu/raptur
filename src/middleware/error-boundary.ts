import { Middleware } from "../types";
import { RapturRequest } from "../request";
import { RapturResponse } from "../response";

export type ErrorHandler = (
  err: unknown,
  req: RapturRequest,
  res: RapturResponse,
) => unknown | Promise<unknown>;

/**
 * Wrap the downstream pipeline in a try/catch. Any thrown error is passed to
 * `onError` (default: log and respond `500`). Place this near the top of a
 * pipeline so it guards everything below it.
 */
export function errorBoundary(onError?: ErrorHandler): Middleware {
  const handle: ErrorHandler = onError ?? ((err, _req, res) => {
    console.error("🚨 Route handler error:", err);
    if (!res.sent) res.status(500).json({ error: "Internal Server Error" });
  });

  return async (req, res, next) => {
    try {
      await next();
    } catch (err) {
      await handle(err, req, res);
    }
  };
}
