import { AddressInfo } from "node:net";

import { Raptur, handler, auth, cache, json, validate } from "../src";

let app: Raptur;
let base: string;
let handlerHits = 0;

beforeAll(async () => {
  app = new Raptur();

  app
    .get("/health", handler((_q, res) => res.json({ ok: true })))
    .get(
      "/users/:id",
      auth({ token: "secret" }),
      cache({ ttl: 60 }),
      handler((req, res) => {
        handlerHits += 1;
        res.json({ id: req.params.id, hits: handlerHits });
      }),
    )
    .post(
      "/users",
      json(),
      validate((req) => Boolean(req.body?.name)),
      handler((req, res) => res.status(201).json({ created: req.body.name })),
    );

  await new Promise<void>((resolve) => app.httpServer.listen(0, resolve));
  const { port } = app.httpServer.address() as AddressInfo;
  base = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => app.httpServer.close(() => resolve()));
});

describe("router pipeline", () => {
  it("serves a terminal handler", async () => {
    const r = await fetch(`${base}/health`);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true });
  });

  it("404s an unmatched route", async () => {
    const r = await fetch(`${base}/nope`);
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual({ error: "Not Found" });
  });

  it("extracts URL params", async () => {
    const r = await fetch(`${base}/users/42`, { headers: { authorization: "Bearer secret" } });
    expect(r.status).toBe(200);
    expect(((await r.json()) as { id: string }).id).toBe("42");
  });

  it("enforces auth before the handler runs", async () => {
    const r = await fetch(`${base}/users/7`); // no token
    expect(r.status).toBe(401);
  });

  it("serves the cached response on a repeat request", async () => {
    const before = handlerHits;
    const a = await (await fetch(`${base}/users/99`, { headers: { authorization: "Bearer secret" } })).json();
    const b = await (await fetch(`${base}/users/99`, { headers: { authorization: "Bearer secret" } })).json();
    expect(a).toEqual(b);
    expect(handlerHits).toBe(before + 1); // handler ran once across both requests
  });

  it("validates a POST body and 400s when invalid", async () => {
    const bad = await fetch(`${base}/users`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(bad.status).toBe(400);

    const ok = await fetch(`${base}/users`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "rex" }),
    });
    expect(ok.status).toBe(201);
    expect(await ok.json()).toEqual({ created: "rex" });
  });
});
