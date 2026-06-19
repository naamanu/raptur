import { RapturRequest } from "./request";
import { RapturResponse } from "./response";

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

/** Terminal handler: the end of a pipeline that writes the response. */
export type RouteHandler = (req: RapturRequest, res: RapturResponse) => unknown | Promise<unknown>;

/** Advance to the next middleware in the pipeline. */
export type Next = () => Promise<void>;

/**
 * A composable unit of request handling. Call `next()` to defer to the rest of
 * the pipeline, or write to `res` to terminate it. A `RouteHandler` is just a
 * `Middleware` that ignores `next` — see `handler()` in `compose.ts`.
 */
export type Middleware = (
  req: RapturRequest,
  res: RapturResponse,
  next: Next,
) => unknown | Promise<unknown>;

export interface Route {
  method: HttpMethod;
  path: string;
  /** The route's middlewares folded into a single composed pipeline. */
  handler: Middleware;
}


