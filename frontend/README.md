# frontend

Vue 3 + TypeScript SPA. With Docker, `docker compose up` from the repo root runs it — nothing else to do. The steps below are for running it bare-metal.

The backend must be reachable for the app to work; the API base URL defaults to `http://127.0.0.1:8000` and can be overridden via `VITE_API_BASE_URL` (see [.env.example](./.env.example)).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
npm run test:unit
```

### Run End-to-End Tests with [Cypress](https://www.cypress.io/)

```sh
npm run test:e2e:dev
```

This runs the end-to-end tests against the Vite development server.
It is much faster than the production build.

But it's still recommended to test the production build with `test:e2e` before deploying (e.g. in CI environments):

```sh
npm run build
npm run test:e2e
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```
