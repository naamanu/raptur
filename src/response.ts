import http from "node:http"

export class RapturResponse {
  private _sent = false;

  constructor(private res: http.ServerResponse) { }

  /** Whether a response body has already been written. Pipeline middleware
   *  (terminal 404, cache, cors) reads this to avoid double-sending. */
  get sent(): boolean {
    return this._sent;
  }

  /** The current status code, readable by middleware (e.g. logger, cache). */
  get statusCode(): number {
    return this.res.statusCode;
  }

  status(code: number): RapturResponse {
    this.res.statusCode = code;
    return this;
  }

  json(data: any): void {
    if (this._sent) return;
    this._sent = true;
    this.res.setHeader('Content-Type', 'application/json');
    this.res.end(JSON.stringify(data));
  }

  send(data: string): void {
    if (this._sent) return;
    this._sent = true;
    this.res.setHeader('Content-Type', 'text/plain');
    this.res.end(data);
  }

  setHeader(name: string, value: string): RapturResponse {
    this.res.setHeader(name, value);
    return this;
  }
}

