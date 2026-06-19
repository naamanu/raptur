import http from "node:http"
import { URL } from "node:url"

import { BodyError } from "./errors";

/** Default maximum JSON body size: 1 MiB. */
export const DEFAULT_BODY_LIMIT = 1024 * 1024;

export interface JsonOptions {
  /** Maximum body size in bytes before a `413` is raised. Default 1 MiB. */
  limit?: number;
}

export class RapturRequest {
  public params: Record<string, string> = {};
  public query: Record<string, string> = {};
  public body: any;
  public headers: http.IncomingHttpHeaders;
  /** Uppercase HTTP method, e.g. `GET`. */
  public method: string;
  private parsed = false;

  constructor(private req: http.IncomingMessage, private url: URL) {
    this.headers = req.headers;
    this.method = (req.method ?? "GET").toUpperCase();
  }

  /** Request path without query string, e.g. `/api/users/1`. */
  get path(): string {
    return this.url.pathname;
  }

  /**
   * Read and parse the JSON request body, caching the result on `req.body`.
   * An empty body yields `{}`. Throws a {@link BodyError} (413) when the body
   * exceeds `limit`, or (400) when it is present but not valid JSON.
   */
  async json(opts: JsonOptions = {}): Promise<any> {
    if (this.parsed) return this.body;

    const limit = opts.limit ?? DEFAULT_BODY_LIMIT;
    const chunks: Buffer[] = [];
    let size = 0;

    for await (const chunk of this.req) {
      size += chunk.length;
      if (size > limit) {
        throw new BodyError(`Request body exceeds ${limit} bytes`, 413);
      }
      chunks.push(chunk as Buffer);
    }

    const raw = Buffer.concat(chunks).toString();
    this.parsed = true;

    if (raw.trim() === "") {
      this.body = {};
      return this.body;
    }

    try {
      this.body = JSON.parse(raw);
    } catch {
      throw new BodyError("Invalid JSON body", 400);
    }
    return this.body;
  }
}


