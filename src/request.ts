import http from "node:http"
import { URL } from "node:url"

export class RapturRequest {
  public params: Record<string, string> = {};
  public query: Record<string, string> = {};
  public body: any;
  public headers: http.IncomingHttpHeaders;
  /** Uppercase HTTP method, e.g. `GET`. */
  public method: string;

  constructor(private req: http.IncomingMessage, private url: URL) {
    this.headers = req.headers;
    this.method = (req.method ?? "GET").toUpperCase();
  }

  /** Request path without query string, e.g. `/api/users/1`. */
  get path(): string {
    return this.url.pathname;
  }

  async json() {
    if (!this.body) {
      const chunks = [];
      for await (const chunk of this.req) {
        chunks.push(chunk);
      }
      const data = Buffer.concat(chunks).toString();
      try {
        this.body = JSON.parse(data);
      } catch (e) {
        console.error(e)
        this.body = {};
      }
    }
    return this.body;
  }
}


