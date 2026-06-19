import { Middleware } from "../types";

export interface LoggerOptions {
  /** Sink for log lines. Default `console.log`. */
  log?: (line: string) => void;
}

/**
 * Log `METHOD path -> status (Nms)` around the rest of the pipeline. Runs the
 * downstream chain inside a timer and reports once it settles.
 */
export function logger(opts: LoggerOptions = {}): Middleware {
  const log = opts.log ?? ((line: string) => console.log(line));

  return async (req, res, next) => {
    const start = Date.now();
    try {
      await next();
    } finally {
      const ms = Date.now() - start;
      log(`🦕 ${req.method} ${req.path} -> ${res.statusCode} (${ms}ms)`);
    }
  };
}
