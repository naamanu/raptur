import { Raptur, compose, handler, auth, cache, cors, json, logger } from "../src";

const app = new Raptur({ silent: false });

// Global middleware runs before every route, in order.
app.use(logger(), cors());

app
  // A plain terminal handler is a valid Middleware (it just ignores `next`).
  .get("/api/health", (req, res) => {
    res.json({ ok: true });
  })
  // Compose cross-cutting concerns into a route pipeline.
  .get(
    "/api/users/:id",
    auth({ token: "secret" }),
    cache({ ttl: 30 }),
    handler((req, res) => {
      res.json({ userId: req.params.id });
    }),
  )
  .post(
    "/api/users",
    json(),
    compose(
      auth({ token: "secret" }),
      handler((req, res) => {
        res.status(201).json({ message: "User created", data: req.body });
      }),
    ),
  );

app.start(() => {
  console.log("🦖 try: curl -H 'authorization: Bearer secret' localhost:3000/api/users/42");
});
