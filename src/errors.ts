/**
 * An error tied to an HTTP status, thrown while reading/parsing a request body.
 * The `json()` middleware maps these to responses (e.g. 400 / 413).
 */
export class BodyError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "BodyError";
  }
}
