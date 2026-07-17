# M1 — Auth & roles

> **Date:** 2026-07-17
> **Milestone:** M1 (spec §11) — "Consolidated login, roles, profile; auth tests. Exit: F1 complete + tests green."
> **Branch:** `m1-auth-roles` (off `main` after PR #1 squash-merge)

## Scope decision (author, this session)

The audit flagged a conflict between spec F1.4 ("no public user pages in MVP") and the existing Users directory + profile pages. **Decision: keep both, accessible only to logged-in users.** "Public" is interpreted as "visible without login" — so when M2 opens anonymous read access for the map/reports/polls, the user pages stay auth-only. Additionally (implementation call, from the audit's privacy MAJOR): user e-mail addresses are no longer serialized anywhere in the API or shown in the UI — a user sees their own e-mail only via `/api/users/me/`.

## Changes

### Backend
- `User.role` — `citizen` (default) | `admin`, spec F1.3; migration `account.0005`. Admins are promoted via the Django admin: the bare `admin.site.register(User)` was replaced with a full `UserAdmin` (role in list/filter/fieldsets, correct add/change forms for the custom user model — `AdminUserChangeForm` + reused `SignupForm`).
- `/api/users/me/` now returns `role`.
- `user_list`: list-via-POST → **GET** `?q=` (spec §8 migration task for users), searches by **name only** (no more search-by-email).
- `UserSerializer` no longer serializes `email` (affects every place a user is embedded: posts, comments, profile, directory).
- **pytest + ruff** (spec §9): `requirements-dev.txt` (pytest 9.1.1, pytest-django 4.12.0, ruff 0.15.22), `pyproject.toml` config; ruff violations fixed across all apps (19 found: unused imports/variables).
- **16 auth/account tests** in `account/tests.py` (pytest + DRF `APIClient`): signup (active citizen by default / duplicate e-mail / password mismatch), login (token pair / wrong password), `/me` (anon 401 / profile incl. role), editprofile (anon 401 / update / taken e-mail), editpassword (change + re-login / wrong old password), user list & detail (auth required / GET-only / name search / no e-mail in payload).

### Frontend
- User store: `role: 'citizen' | 'admin' | null` persisted/restored/cleared alongside the other profile fields (login → `/me` already flows it in).
- `UsersView` → `GET /api/users/list/?q=`; `UserCard` and the `User` interface drop `email`; `EditProfileView` passes the current role through `setUserInfo`.
- First frontend unit tests per spec §9: user store (5 cases incl. init/refresh with mocked axios), toast store (visibility + animation timers), Login/Signup render tests (2), plus the existing QuestionCard test → **10 tests**.

## F1 status after this session

- F1.1 registration ✅ (M0: active account, uniqueness tested)
- F1.2 login/logout, session persists ✅ (JWT + localStorage restore; logout in `AppHeader`)
- F1.3 role field, admin-promoted ✅ (this session)
- F1.4 minimal profile ✅; user pages login-only per decision above; e-mail private to owner ✅

## Gates

`pytest` 16/16 · `ruff check` clean · `manage.py check`/`test`/`makemigrations --check` clean · `npm run build` / `lint` / `test:unit` (10/10) green.

## Review notes for the author

- The role is not yet *used* for permissions anywhere — M2 moderation endpoints will be the first consumer (`role == 'admin'` checks or a DRF permission class).
- `manage.py test` still exits 0 but runs 0 tests (the suite is pytest-style); **pytest is the canonical backend runner** from now on — reflected in CLAUDE.md/READMEs.
- Admin promotion flow: Django admin → Users → edit → set role to Admin (also grants nothing else; `is_staff` stays separate for admin-site access).
