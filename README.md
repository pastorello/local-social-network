# Local Social Network

A civic engagement platform for small cities (pilot: Gaeta, LT): citizens report local issues on a shared map, support each other's reports, and vote on public polls.

- **Spec:** [docs/mvp-spec.md](./docs/mvp-spec.md) — scope changes start here (spec-first workflow)
- **AI session logs:** [docs/ai-log/](./docs/ai-log/)

## Quickstart (Docker)

```sh
cp .env.example .env   # optional — the defaults work for local development
docker compose up --build
```

- Frontend: http://localhost:5173
- API: http://127.0.0.1:8000
- Django admin: http://127.0.0.1:8000/admin/

The compose stack runs PostgreSQL; bare-metal runs fall back to SQLite automatically.

## Bare-metal setup

- [Backend guide](./backend/README.md)
- [Frontend guide](./frontend/README.md)

## Roadmap

Milestones are defined in the spec (§11): M0 recovery & audit → M1 auth & roles → M2 map & issue reports → M3 polls → M4 public demo.
