import { Middleware } from "../types";
import { RapturRequest } from "../request";

/** Returns `true`/`undefined` when valid, or `false`/an error message when not. */
export type Validator = (req: RapturRequest) => boolean | string | void;

/**
 * Run a predicate against the request and short-circuit with `400` when it
 * fails. Return a string from the validator to use it as the error message.
 * Pair with `json()` upstream when validating `req.body`.
 */
export function validate(check: Validator): Middleware {
  return (req, res, next) => {
    const result = check(req);
    if (result === false || typeof result === "string") {
      res.status(400).json({ error: typeof result === "string" ? result : "Bad Request" });
      return;
    }
    return next();
  };
}
