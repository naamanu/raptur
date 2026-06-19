import { compose, handler } from "../src/compose";
import { Middleware } from "../src/types";
import { RapturRequest } from "../src/request";
import { RapturResponse } from "../src/response";

// compose() only forwards req/res, so opaque stand-ins are sufficient here.
const req = {} as RapturRequest;
const res = {} as RapturResponse;

describe("compose", () => {
  it("runs middleware in registration order, around next()", async () => {
    const order: string[] = [];
    const a: Middleware = async (_q, _s, next) => {
      order.push("a:before");
      await next();
      order.push("a:after");
    };
    const b: Middleware = async (_q, _s, next) => {
      order.push("b:before");
      await next();
      order.push("b:after");
    };

    await compose(a, b)(req, res, async () => {
      order.push("terminal");
    });

    // Onion model: inner middleware unwinds before outer.
    expect(order).toEqual(["a:before", "b:before", "terminal", "b:after", "a:after"]);
  });

  it("propagates async return values / awaits the chain", async () => {
    const seen: number[] = [];
    const mw: Middleware = async (_q, _s, next) => {
      await new Promise((r) => setTimeout(r, 5));
      seen.push(1);
      await next();
    };
    await compose(mw)(req, res, async () => {
      seen.push(2);
    });
    expect(seen).toEqual([1, 2]);
  });

  it("rejects when next() is called more than once", async () => {
    const bad: Middleware = async (_q, _s, next) => {
      await next();
      await next();
    };
    await expect(compose(bad)(req, res, async () => {})).rejects.toThrow("next() called multiple times");
  });

  it("propagates thrown errors", async () => {
    const boom: Middleware = () => {
      throw new Error("boom");
    };
    await expect(compose(boom)(req, res, async () => {})).rejects.toThrow("boom");
  });

  it("handler() adapts a terminal fn and ignores next", async () => {
    let called = false;
    let nextCalled = false;
    const mw = handler((_q, _s) => {
      called = true;
    });
    await compose(mw)(req, res, async () => {
      nextCalled = true;
    });
    expect(called).toBe(true);
    expect(nextCalled).toBe(false);
  });
});
