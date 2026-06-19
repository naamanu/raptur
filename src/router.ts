import http from "node:http"
import { URL } from 'node:url';

import { RapturRequest } from "./request"
import { RapturResponse } from "./response"
import { compose } from "./compose";
import { errorBoundary } from "./middleware/error-boundary";
import { HttpMethod, Middleware, Route } from "./types";


export class Raptur {
  private routes: Route[] = [];
  private globalMiddleware: Middleware[] = [];
  private server: http.Server;

  constructor(private port: number = 3000) {
    this.server = http.createServer(this.handleRequest.bind(this));
    console.log(`
         __    _                   
        / _)  / \\        /\\  /\\    
       /(_)(  \\_/       /  \\/  \\   
      (____)\\  _    ___/   /\\   \\
           U  (_)  (___/   \\/   /  
               _    _  \\_      /   
              (____(__  \\_____/    
            
    🦖 Raptur Router initialized`);
  }

  /** Register global middleware run before every matched route, in order. */
  use(...middleware: Middleware[]): this {
    this.globalMiddleware.push(...middleware);
    return this;
  }

  get(path: string, ...middleware: Middleware[]): this {
    return this.addRoute('GET', path, middleware);
  }

  post(path: string, ...middleware: Middleware[]): this {
    return this.addRoute('POST', path, middleware);
  }

  put(path: string, ...middleware: Middleware[]): this {
    return this.addRoute('PUT', path, middleware);
  }

  delete(path: string, ...middleware: Middleware[]): this {
    return this.addRoute('DELETE', path, middleware);
  }

  private addRoute(method: HttpMethod, path: string, middleware: Middleware[]): this {
    this.routes.push({ method, path, handler: compose(...middleware) });
    console.log(`🦕 Route registered: ${method} ${path}`);
    return this;
  }

  private extractParams(routePath: string, requestPath: string): Record<string, string> | null {
    const routeParts = routePath.split('/');
    const requestParts = requestPath.split('/');

    if (routeParts.length !== requestParts.length) {
      return null;
    }

    const params: Record<string, string> = {};

    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(':')) {
        const paramName = routeParts[i].slice(1);
        params[paramName] = requestParts[i];
      } else if (routeParts[i] !== requestParts[i]) {
        return null;
      }
    }

    return params;
  }

  private async handleRequest(nodeReq: http.IncomingMessage, nodeRes: http.ServerResponse) {
    const method = nodeReq.method as HttpMethod;
    const url = new URL(nodeReq.url || '', `http://${nodeReq.headers.host}`);

    const req = new RapturRequest(nodeReq, url);
    const res = new RapturResponse(nodeRes);
    req.query = Object.fromEntries(url.searchParams);

    const match = this.match(method, url.pathname);
    if (match) {
      req.params = match.params;
    }

    // Terminal step: the matched route's pipeline, or a 404 if nothing matched.
    const terminal: Middleware = match
      ? match.route.handler
      : (_req, _res) => { _res.status(404).json({ error: 'Not Found' }); };

    // A default error boundary always guards the whole pipeline so an
    // uncaught throw becomes a 500 rather than a hung socket.
    const pipeline = compose(errorBoundary(), ...this.globalMiddleware, terminal);
    await pipeline(req, res, async () => {
      if (!res.sent) res.status(404).json({ error: 'Not Found' });
    });
  }

  private match(method: HttpMethod, pathname: string): { route: Route; params: Record<string, string> } | null {
    for (const route of this.routes) {
      if (route.method !== method) continue;
      const params = this.extractParams(route.path, pathname);
      if (params) return { route, params };
    }
    return null;
  }

  start(callback?: () => void): void {
    this.server.listen(this.port, () => {
      console.log(`🦖 Raptur is hunting on port ${this.port}`);
      callback?.();
    });
  }

  /** The underlying `http.Server`, e.g. to `.close()` it or read its address. */
  get httpServer(): http.Server {
    return this.server;
  }
}
