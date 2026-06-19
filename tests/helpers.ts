import http from "node:http";
import { Readable } from "node:stream";
import { URL } from "node:url";

import { RapturRequest } from "../src/request";
import { RapturResponse } from "../src/response";

export interface Captured {
  statusCode: number;
  headers: Record<string, string>;
  body: string | undefined;
  ended: boolean;
}

/** Build a RapturResponse over a fake ServerResponse that records what was sent. */
export function makeRes(): { res: RapturResponse; out: Captured } {
  const out: Captured = { statusCode: 200, headers: {}, body: undefined, ended: false };
  const fake = {
    get statusCode() {
      return out.statusCode;
    },
    set statusCode(code: number) {
      out.statusCode = code;
    },
    setHeader(name: string, value: string) {
      out.headers[name.toLowerCase()] = value;
    },
    end(data?: string) {
      out.ended = true;
      out.body = data;
    },
  } as unknown as http.ServerResponse;

  return { res: new RapturResponse(fake), out };
}

export interface ReqInit {
  method?: string;
  path?: string;
  headers?: http.IncomingHttpHeaders;
  body?: unknown;
}

/** Build a RapturRequest backed by an in-memory stream for the JSON body. */
export function makeReq(init: ReqInit = {}): RapturRequest {
  const { method = "GET", path = "/", headers = {}, body } = init;
  const stream = Readable.from(body === undefined ? [] : [Buffer.from(JSON.stringify(body))]);
  const fake = Object.assign(stream, { headers, method }) as unknown as http.IncomingMessage;
  const url = new URL(path, "http://localhost");
  const req = new RapturRequest(fake, url);
  req.query = Object.fromEntries(url.searchParams);
  return req;
}
