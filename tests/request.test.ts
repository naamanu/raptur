import { makeReq } from "./helpers";

describe("RapturRequest", () => {
  it("normalizes the method to uppercase and exposes the path", () => {
    const req = makeReq({ method: "post", path: "/api/x?y=1" });
    expect(req.method).toBe("POST");
    expect(req.path).toBe("/api/x");
  });

  it("parses and caches the JSON body across json() calls", async () => {
    const req = makeReq({ method: "POST", body: { name: "rex" } });
    expect(await req.json()).toEqual({ name: "rex" });
    expect(await req.json()).toEqual({ name: "rex" }); // served from cache
    expect(req.body).toEqual({ name: "rex" });
  });

  it("falls back to {} on an empty body", async () => {
    const req = makeReq({ method: "POST" });
    expect(await req.json()).toEqual({});
  });

  it("throws a 413 BodyError past the limit", async () => {
    const req = makeReq({ method: "POST", body: { a: "x".repeat(100) } });
    await expect(req.json({ limit: 5 })).rejects.toMatchObject({ status: 413 });
  });

  it("throws a 400 BodyError on malformed JSON", async () => {
    const req = makeReq({ method: "POST", rawBody: "{ not json" });
    await expect(req.json()).rejects.toMatchObject({ status: 400 });
  });
});
