import { RapturRequest } from "./request";
import { RapturResponse } from "./response";
import { Middleware, Next, RouteHandler } from "./types";

/**
 * Fold a list of middlewares into a single middleware. Each middleware receives
 * a `next` that invokes the rest of the chain; calling it more than once throws.
 * When the composed middleware's own `next` is provided it runs after the chain
 * is exhausted, letting composed pipelines nest inside one another.
 *
 * Based on the koa-compose dispatch algorithm.
 */
export function compose(...middlewares: Middleware[]): Middleware {
  return function composed(req: RapturRequest, res: RapturResponse, done?: Next): Promise<void> {
    let lastIndex = -1;

    function dispatch(index: number): Promise<void> {
      if (index <= lastIndex) {
        return Promise.reject(new Error("next() called multiple times"));
      }
      lastIndex = index;

      const fn = index === middlewares.length ? done : middlewares[index];
      if (!fn) {
        return Promise.resolve();
      }

      try {
        return Promise.resolve(fn(req, res, () => dispatch(index + 1))).then(() => undefined);
      } catch (err) {
        return Promise.reject(err);
      }
    }

    return dispatch(0);
  };
}

/**
 * Adapt a terminal `(req, res)` handler into a `Middleware`. The resulting
 * middleware never calls `next`, so it caps a pipeline. This lets plain handlers
 * (as in the README examples) slot into `compose(...)`.
 */
export function handler(fn: RouteHandler): Middleware {
  return (req, res) => fn(req, res);
}
