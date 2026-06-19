import { compose } from "./compose";
import { RapturRequest } from "./request";
import { RapturResponse } from "./response";
import { Middleware, Next } from "./types";

/** A class method usable as a route handler / terminal middleware. */
type HandlerMethod = (req: RapturRequest, res: RapturResponse, next?: Next) => unknown;

/**
 * Standard (TC39 Stage-3) method decorator that wraps a route-handler method in
 * a middleware pipeline. The decorated method becomes the terminal step, so
 * `@use(auth(), cache())` runs those before the method body:
 *
 * ```ts
 * class UserRoutes {
 *   @use(auth(), cache({ ttl: 60 }))
 *   getUser(req: RapturRequest, res: RapturResponse) {
 *     res.json({ id: req.params.id });
 *   }
 * }
 * ```
 *
 * Requires no `experimentalDecorators` / `reflect-metadata` — it relies only on
 * the native decorator emit in TypeScript 5.x, keeping the library zero-dep.
 */
export function use(...middleware: Middleware[]) {
  return function <This>(
    target: HandlerMethod,
    _context: ClassMethodDecoratorContext<This, HandlerMethod>,
  ): HandlerMethod {
    return function (this: This, req: RapturRequest, res: RapturResponse, next?: Next) {
      const terminal: Middleware = (r, s) => target.call(this, r, s);
      return compose(...middleware, terminal)(req, res, next ?? (() => Promise.resolve()));
    };
  };
}
