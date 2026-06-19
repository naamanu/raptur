# 🦖 Raptur

<!--[![npm version](https://img.shields.io/npm/v/raptor-router.svg)](https://www.npmjs.com/package/raptor-router)-->
<!--[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)-->
<!--[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)-->
<!--[![Build Status](https://img.shields.io/github/workflow/status/yourusername/raptor-router/CI)](https://github.com/yourusername/raptor-router/actions)-->

```ascii
     __    _                   
    / _)  / \        /\  /\    
   /(_)(  \_/       /  \/  \   
  (____)\  _    ___/   /\   \  
       U  (_)  (___/   \/   /  
           _    _  \_      /   
          (____(__  \_____/    
```

Raptur is a TypeScript-first HTTP router for Node.js built on `node:http`. Routes are **composable middleware pipelines**: each route is a stack of small, single-purpose middleware (`auth`, `cache`, `validate`, …) folded together with `compose()` and capped by a terminal handler.

## Features

- 🚀 Simple routing
- 🧩 Composable middleware pipelines (`compose`)
- 🔋 Batteries included: `auth`, `cache`, `cors`, `validate`, `logger`, `json`, `errorBoundary`
- 🎀 Optional standard (TC39) `@use` decorator — no `reflect-metadata`
- 💪 Built with TypeScript, async/await throughout
- 🔍 URL parameter parsing
- 📦 Zero **runtime** dependencies
- 🦕 Prehistoric power!

## Installation
Still WIP so not on npm yet.

```bash
npm install raptur
```

## Quick Start

```typescript
import { Raptur, compose, handler, auth, cache, json, logger, cors } from 'raptur';

const app = new Raptur(); // can pass optional port, default is :3000

// Global middleware runs before every route.
app.use(logger(), cors());

app
  // A plain handler is a valid middleware — it just ignores `next`.
  .get('/api/hello', (req, res) => {
    res.json({ message: 'Hello from Raptur! 🦖' });
  })
  // Compose cross-cutting concerns into a route pipeline.
  .get('/api/users/:id',
    auth({ token: 'secret' }),
    cache({ ttl: 30 }),
    handler((req, res) => res.json({ userId: req.params.id })),
  )
  .post('/api/users',
    json(),
    handler((req, res) => {
      res.status(201).json({ message: 'User created', data: req.body });
    }),
  );

app.start(() => {
  console.log('🦖 Raptur is hunting on port 3000');
});
```

## API Reference

### Creating a Router

```typescript
import { Raptur } from 'raptur';
const app = new Raptur();
```

### Route Methods

Each method accepts a path and **one or more middleware**, composed in order:

```typescript
app.use(...middleware: Middleware[]);                  // global middleware
app.get(path: string, ...middleware: Middleware[]);
app.post(path: string, ...middleware: Middleware[]);
app.put(path: string, ...middleware: Middleware[]);
app.patch(path: string, ...middleware: Middleware[]);
app.delete(path: string, ...middleware: Middleware[]);
app.options(path: string, ...middleware: Middleware[]);
app.head(path: string, ...middleware: Middleware[]);
```

The constructor takes a port or an options object, and is **quiet by default**
(pass `{ silent: false }` for the startup banner and route logs). `app.stop()`
closes the server and returns a promise.

```typescript
const app = new Raptur({ port: 8080, silent: false });
// ...later
await app.stop();
```

### Middleware & Composition

A `Middleware` is `(req, res, next) => unknown`. Call `next()` to continue the
pipeline, or write to `res` to end it. A terminal `(req, res)` handler is wrapped
with `handler()`; `compose()` folds many middleware into one (Koa onion order).

```typescript
import { compose, handler } from 'raptur';

const pipeline = compose(
  auth({ token: 'secret' }),
  cache({ ttl: 60 }),
  handler((req, res) => res.json({ ok: true })),
);
```

#### Built-in middleware

| Factory | Purpose |
| --- | --- |
| `json({ limit? })` | Parse the JSON body into `req.body`; `413` over `limit` (default 1 MiB), `400` on malformed JSON |
| `auth({ token \| verify })` | Reject unauthenticated requests with `401` (throws if neither option is given) |
| `cache({ ttl, max? })` | Replay a captured **2xx** response within `ttl` seconds; bounded store (default `max` 1000) |
| `validate(check)` | `400` when a predicate fails (return a string for the message) |
| `cors(opts?)` | Set CORS headers; `204` on preflight `OPTIONS` |
| `logger(opts?)` | Log `METHOD path -> status (Nms)` |
| `errorBoundary(onError?)` | Catch downstream throws → `500` (applied by default) |

### `@use` decorator (optional)

A standard (TC39) method decorator wraps a route-handler method in a pipeline —
no `experimentalDecorators` or `reflect-metadata` required:

```typescript
import { use, auth, cache } from 'raptur';

class UserRoutes {
  @use(auth({ token: 'secret' }), cache({ ttl: 60 }))
  getUser(req: RapturRequest, res: RapturResponse) {
    res.json({ id: req.params.id });
  }
}
```

### Request Object

```typescript
interface RapturRequest {
  params: Record<string, string>;    // URL parameters
  query: Record<string, string>;     // Query string parameters
  headers: http.IncomingHttpHeaders; // Request headers
  json(): Promise<any>;              // Parse JSON body
}
```

### Response Object

```typescript
interface RapturResponse {
  status(code: number): RapturResponse;
  json(data: any): void;
  send(data: string): void;
  setHeader(name: string, value: string): RapturResponse;
}
```

## URL Parameters

Raptur supports dynamic URL parameters with the `:param` syntax:

```typescript
app.get('/api/users/:id/posts/:postId', (req, res) => {
  const { id, postId } = req.params;
  res.json({ userId: id, postId });
});
```

## Query Parameters

Access query parameters through the `query` object:

```typescript
// GET /api/search?q=raptor&sort=desc
app.get('/api/search', (req, res) => {
  const { q, sort } = req.query;
  res.json({ searchTerm: q, sortOrder: sort });
});
```

## Body Parsing

Parse JSON request bodies with the `json()` method:

```typescript
app.post('/api/data', async (req, res) => {
  const body = await req.json();
  res.json({ received: body });
});
```

## Error Handling

Every pipeline is wrapped in a default `errorBoundary()`, so a thrown error
becomes a `500` automatically:

```typescript
app.get('/api/error', handler(async () => {
  throw new Error('Something went wrong');
  // Automatically returns 500 Internal Server Error
}));
```

Provide your own boundary to customise the response:

```typescript
app.use(errorBoundary((err, req, res) => {
  res.status(502).json({ error: 'Upstream failed' });
}));
```

## Examples

### Basic REST API

```typescript
app
  .get('/api/items', async (req, res) => {
    const items = await getItems();
    res.json(items);
  })
  .post('/api/items', async (req, res) => {
    const body = await req.json();
    const newItem = await createItem(body);
    res.status(201).json(newItem);
  })
  .get('/api/items/:id', async (req, res) => {
    const item = await getItem(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(item);
  })
  .delete('/api/items/:id', async (req, res) => {
    await deleteItem(req.params.id);
    res.status(204).send('');
  });
```

## Contributing

We welcome contributions! Please feel free to submit a Pull Request. Check out our contributing guidelines for more information.

## License

MIT © [Nana Adjei Manu]

## Credits

ASCII art logo generated with love and prehistoric power! 🦖

---

Happy routing with Raptur! 🦕
