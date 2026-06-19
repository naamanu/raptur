# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Raptur is a zero-runtime-dependency, TypeScript-first HTTP router for Node.js, built directly on `node:http`. It is a library (published as `raptur`, currently WIP/pre-npm), not an application. Routes are **composable middleware pipelines**: the public surface is the `Raptur` class plus `compose()`, `handler()`, the built-in middleware factories, and the `@use` decorator — all re-exported from `src/index.ts`.

## Commands

Package manager is **Yarn 4** (`yarn@4.5.3`, see `packageManager` field) running in **PnP mode** (no `node_modules`; deps resolve via `.pnp.*`). Use `yarn`, not `npm`. On a clean checkout, run `yarn install` first.

- `yarn build` — dual ESM+CJS build + `.d.ts` to `dist/` via **tsup** (`tsup.config.ts`)
- `yarn typecheck` — `tsc --noEmit` (the build does not fail on type errors except in the DTS step; run this for a strict check)
- `yarn test` — Jest via **ts-jest** (type-checks as it runs; coverage to `coverage/`)
- `yarn test tests/router.test.ts` — single file; `yarn test -t "name"` — by test name
- `yarn lint` — ESLint over `src/**/*.ts`
- `yarn format` — Prettier write over `src/**/*.ts`

## Architecture

The pipeline is the core abstraction. `Middleware = (req, res, next) => unknown` (`types.ts`); a terminal `RouteHandler = (req, res) => unknown` is adapted into a middleware by `handler()`.

1. **`compose()` (`compose.ts`)** folds many middleware into one using the koa-compose indexed-dispatch algorithm: each gets a `next` that invokes the rest; calling `next()` twice rejects. Unwinding is onion-order (inner middleware's post-`next` code runs before outer's).
2. **`Raptur` (`router.ts`)** owns the `http.Server`. `get/post/put/delete(path, ...mw)` are variadic — they `compose(...mw)` into a single `Route.handler` and push onto a flat `routes[]`. `use(...mw)` registers global middleware. All still `return this` (chaining works but is no longer the headline API).
3. **`handleRequest`** wraps raw req/res, `match()`es the first method+path route (linear scan, exact segment-by-segment via `extractParams`; no wildcard/regex/trailing-slash), then runs `compose(errorBoundary(), ...globalMw, terminal)` where `terminal` is the route pipeline or a 404. A default `errorBoundary()` always guards the chain, and the outer `next` emits 404 if nothing wrote a response.
4. **Built-in middleware (`src/middleware/`)** are `Middleware` factories: `json`, `auth`, `cache`, `validate`, `cors`, `logger`, `errorBoundary` (barrel in `middleware/index.ts`). `cache` wraps `res.json`/`res.send` on a miss to capture the payload and replays it on a hit.
5. **`@use` decorator (`decorators.ts`)** is a **standard TC39 method decorator** (NOT legacy/`experimentalDecorators`, no `reflect-metadata`) that wraps a class method's body in `compose(...mw, method)`.

`RapturRequest` (`request.ts`) exposes `method`, `path`, `params`, `query`, `headers`, and lazy `json()` (buffers once, caches on `req.body`). `RapturResponse` (`response.ts`) guards double-send via the private `_sent` flag exposed through the public `get sent()` and `get statusCode()` getters that middleware reads.

## Conventions & gotchas

- **Standard decorators only.** `tsconfig.json` deliberately omits `experimentalDecorators`/`emitDecoratorMetadata` so TS emits TC39 decorators. Do not add those flags or `reflect-metadata` — it would break `@use` and the zero-runtime-dep guarantee.
- **A bare `(req, res)` handler is a valid `Middleware`** (fewer params is assignable), so it can be passed directly to `get()` without `handler()` — but wrap with `handler()` inside `compose()` for clarity/typing.
- **ts-jest overrides `module` to CommonJS** for tests (`jest.config.ts` transform) independent of the library's NodeNext build. The package is `"type": "commonjs"`, so tsup emits CJS as `index.js` and ESM as `index.mjs` (see the `exports` map).
- Matching is O(routes) per request and order-sensitive; static and param routes of the same shape compete by registration order.
- Examples run against `src/` via `yarn ts-node examples/basic-server.ts`.
