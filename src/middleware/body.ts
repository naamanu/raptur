import { Middleware } from "../types";

/**
 * Eagerly parse a JSON request body into `req.body` before the rest of the
 * pipeline runs. Equivalent to `await req.json()`, but as a composable step so
 * downstream middleware (e.g. `validate`) can rely on `req.body` being present.
 */
export function json(): Middleware {
  return async (req, _res, next) => {
    await req.json();
    return next();
  };
}
