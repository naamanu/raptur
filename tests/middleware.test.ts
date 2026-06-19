import { compose, handler } from "../src/compose";
import { auth, cache, validate, cors, errorBoundary, json, logger } from "../src/middleware";
import { makeReq, makeRes } from "./helpers";

describe("auth", () => {
  it("401s without a credential", async () => {
    const { res, out } = makeRes();
    await compose(auth({ token: "secret" }), handler(() => {}))(makeReq(), res, async () => {});
    expect(out.statusCode).toBe(401);
  });

  it("passes with the matching bearer token", async () => {
    const { res, out } = makeRes();
    const req = makeReq({ headers: { authorization: "Bearer secret" } });
    await compose(auth({ token: "secret" }), handler((_q, s) => s.json({ ok: true })))(req, res, async () => {});
    expect(out.statusCode).toBe(200);
    expect(out.body).toBe(JSON.stringify({ ok: true }));
  });

  it("supports a custom verify predicate", async () => {
    const { res, out } = makeRes();
    const req = makeReq({ headers: { authorization: "Bearer nope" } });
    await compose(auth({ verify: (t) => t === "yes" }), handler(() => {}))(req, res, async () => {});
    expect(out.statusCode).toBe(401);
  });
});

describe("validate", () => {
  it("400s with a custom message when the predicate returns a string", async () => {
    const { res, out } = makeRes();
    const req = makeReq({ method: "POST", body: {} });
    await compose(
      json(),
      validate((r) => (r.body.name ? true : "name required")),
      handler(() => {}),
    )(req, res, async () => {});
    expect(out.statusCode).toBe(400);
    expect(out.body).toBe(JSON.stringify({ error: "name required" }));
  });

  it("passes when valid", async () => {
    const { res, out } = makeRes();
    const req = makeReq({ method: "POST", body: { name: "rex" } });
    await compose(
      json(),
      validate((r) => Boolean(r.body.name)),
      handler((_q, s) => s.status(201).send("ok")),
    )(req, res, async () => {});
    expect(out.statusCode).toBe(201);
  });
});

describe("cache", () => {
  it("replays a captured response on the second identical request", async () => {
    const mw = cache({ ttl: 60 });
    let hits = 0;
    const route = compose(
      mw,
      handler((_q, s) => {
        hits += 1;
        s.json({ hits });
      }),
    );

    const first = makeRes();
    await route(makeReq({ path: "/x" }), first.res, async () => {});
    const second = makeRes();
    await route(makeReq({ path: "/x" }), second.res, async () => {});

    expect(hits).toBe(1); // handler ran only once
    expect(first.out.body).toBe(JSON.stringify({ hits: 1 }));
    expect(second.out.body).toBe(JSON.stringify({ hits: 1 })); // served from cache
  });

  it("misses for a different path", async () => {
    const mw = cache({ ttl: 60 });
    let hits = 0;
    const route = compose(mw, handler((_q, s) => s.json({ n: (hits += 1) })));
    await route(makeReq({ path: "/a" }), makeRes().res, async () => {});
    await route(makeReq({ path: "/b" }), makeRes().res, async () => {});
    expect(hits).toBe(2);
  });
});

describe("cors", () => {
  it("sets headers and 204s a preflight OPTIONS", async () => {
    const { res, out } = makeRes();
    let downstream = false;
    await compose(cors(), handler(() => { downstream = true; }))(
      makeReq({ method: "OPTIONS" }),
      res,
      async () => {},
    );
    expect(out.statusCode).toBe(204);
    expect(out.headers["access-control-allow-origin"]).toBe("*");
    expect(downstream).toBe(false);
  });
});

describe("logger", () => {
  it("logs method, path and final status around the chain", async () => {
    const lines: string[] = [];
    const { res } = makeRes();
    await compose(
      logger({ log: (l) => lines.push(l) }),
      handler((_q, s) => s.status(200).json({ ok: true })),
    )(makeReq({ method: "GET", path: "/ping" }), res, async () => {});
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("GET /ping -> 200");
  });
});

describe("errorBoundary", () => {
  it("turns a thrown error into a 500", async () => {
    const { res, out } = makeRes();
    await compose(
      errorBoundary(),
      handler(() => {
        throw new Error("kaboom");
      }),
    )(makeReq(), res, async () => {});
    expect(out.statusCode).toBe(500);
    expect(out.body).toBe(JSON.stringify({ error: "Internal Server Error" }));
  });
});
