import { makeRes } from "./helpers";

describe("RapturResponse", () => {
  it("writes JSON with the content-type header and marks itself sent", () => {
    const { res, out } = makeRes();
    expect(res.sent).toBe(false);
    res.status(201).json({ ok: true });
    expect(res.sent).toBe(true);
    expect(out.statusCode).toBe(201);
    expect(out.headers["content-type"]).toBe("application/json");
    expect(out.body).toBe(JSON.stringify({ ok: true }));
  });

  it("ignores a second send after a response was already written", () => {
    const { res, out } = makeRes();
    res.send("first");
    res.json({ second: true });
    expect(out.body).toBe("first");
  });

  it("status() and setHeader() are chainable", () => {
    const { res } = makeRes();
    expect(res.status(200)).toBe(res);
    expect(res.setHeader("x-test", "1")).toBe(res);
  });
});
