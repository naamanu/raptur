import { use } from "../src/decorators";
import { auth } from "../src/middleware";
import { RapturRequest } from "../src/request";
import { RapturResponse } from "../src/response";
import { makeReq, makeRes } from "./helpers";

describe("@use decorator", () => {
  class UserRoutes {
    @use(auth({ token: "secret" }))
    getUser(req: RapturRequest, res: RapturResponse) {
      res.json({ id: req.params.id });
    }
  }

  it("runs the middleware before the method body", async () => {
    const routes = new UserRoutes();

    const denied = makeRes();
    await routes.getUser(makeReq(), denied.res);
    expect(denied.out.statusCode).toBe(401);

    const allowed = makeRes();
    const req = makeReq({ headers: { authorization: "Bearer secret" } });
    req.params = { id: "5" };
    await routes.getUser(req, allowed.res);
    expect(allowed.out.statusCode).toBe(200);
    expect(allowed.out.body).toBe(JSON.stringify({ id: "5" }));
  });
});
