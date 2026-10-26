# Deployment

Two ways to read this file. The first part is **a VPS with Docker Compose**,
end to end, because that is the closest thing to what development already uses
and it needs no platform to be learned. The second is what any *other* platform
would need, for the day one is chosen.

The stack is deliberately small: **one virtual machine, one domain, three
containers.** No object storage, no CDN, no load balancer, nothing to configure
in a cloud console.

---

## The setup chosen on 2026-10-21 — OVHcloud and Brevo

`viveregaeta.it` and one **VPS-1** at OVHcloud, mail through **Brevo's free
plan**. The reasons, and what was turned down, are in
[ADR-0009](./adr/0009-where-it-runs.md). This is the order to do it in;
where a step is the same on any VPS, it points to Part 1 rather than repeating
it.

**Walked for real on 2026-10-22**, and live at `https://viveregaeta.it` since:
every step below is the one that worked, and what the first run taught is
written into it rather than kept in somebody's memory.

### 1. Buy the domain and the server (OVHcloud)

One OVHcloud account holds both.

- **The domain, `viveregaeta.it`.** The registrant's name must match their
  **codice fiscale** exactly — NIC.it checks, and a mismatch fails the
  registration — and NIC.it sends the registrant a verification e-mail that has
  to be answered before the domain is active. Keep OVH's own DNS servers: the
  zone stays at OVH, next to the server.
- **The server, VPS-1**, in a main European region — **not a Local Zone**,
  which leaves out NVMe and some features. Image: Ubuntu LTS — the first
  deploy ran **26.04**, and Docker's install script handled it. Paste your SSH
  public key into the order form, so the machine is born with key login and no
  password to guess. Note its IPv4 address.
- **If you ordered without a key**, OVH mails a password for `ubuntu` that has
  already expired: the first login makes you change it and then closes the
  session. Make a key on your own machine if it has none
  (`ssh-keygen -t ed25519`, `ssh-add --apple-use-keychain ~/.ssh/id_ed25519`
  on a Mac), then `ssh-copy-id ubuntu@<IPv4>`; from then on, no password.

### 2. Point the domain at the server (OVH's DNS zone)

A new OVH domain comes with records pointing at OVH's parking page. In the
domain's DNS zone, make the apex and `www` point at the VPS, and remove any
other A, AAAA or CNAME record OVH created for those two names:

| Type | Sub-domain | Target |
|---|---|---|
| A | *(empty — the domain itself)* | the VPS's IPv4 |
| A | `www` | the same IPv4 — Caddy redirects it to the domain |

**No AAAA record yet.** Let's Encrypt prefers IPv6 when a name has one, and an
IPv6 path nobody has tested is the classic way to fail the first certificate.
Add it once `curl -6 https://viveregaeta.it` works from somewhere else.

OVH's default MX and SPF records can stay: Brevo's authentication needs
neither, and they are what an OVH e-mail redirect (an `info@` that reaches your
own inbox, optional) would use; so is the `info@` mailbox OVH now gives with a
new domain (Zimbra Starter). Delete the TXT `"1|www.viveregaeta.it"` OVH adds:
it belongs to its parking redirect.

**Wait until the name answers the VPS's address** before step 4 — Caddy asks
for the certificate on its first start — and ask from the VPS:
`dig +short viveregaeta.it @dns103.ovh.net`. Your own network may be no
witness: on 2026-10-22 the author's router answered every DNS query from a
cache, even ones addressed to OVH's servers, and kept the parking address for
the zone's TTL (an hour). `https://dns.google/resolve?name=viveregaeta.it`
is another honest view.

### 3. Brevo — the sender

1. A free account. It asks for no card.
2. **Authenticate the domain** (Senders, domains & dedicated IPs → Domains →
   add `viveregaeta.it`, manual setup). Brevo shows three kinds of record: a
   TXT holding a `brevo-code` (proof you own the domain), DKIM (one TXT or two
   CNAMEs, depending on the account) and a DMARC TXT. **Copy each into OVH's
   zone exactly as Brevo prints it** — the values are per account, so none are
   written here — and keep a single DMARC record. Then ask Brevo to verify;
   it can take some hours.
3. **Add the sender** `noreply@viveregaeta.it`, named *Vivere Gaeta*.
4. **Create an SMTP key** (SMTP & API → SMTP). Note the server, the port and
   the **login** shown there — the login is an identifier Brevo issues, not
   your account e-mail. The key is shown once; it goes into `deploy/.env` and
   nowhere else.

In OVH's zone editor, write a record's sub-domain without the domain
(`brevo1._domainkey`, not `brevo1._domainkey.viveregaeta.it`), and check that a
CNAME's target was saved as Brevo printed it: if OVH shows it with
`.viveregaeta.it` appended, re-enter it with a trailing dot. Before pressing
Brevo's *verify*, the records can be read back from public DNS (the TXT on the
domain, `_dmarc`, and `brevo1`/`brevo2._domainkey` resolving to a `k=rsa` key).

An invite in a spam folder is a collaborator who never gets in, which is why
step 2 is not optional.

### 4. The server

```sh
ssh ubuntu@<the VPS's IPv4>
sudo apt update && sudo apt -y upgrade
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu        # then log out and back in
git clone https://github.com/pastorello/local-social-network.git
cd local-social-network
cp deploy/.env.example deploy/.env
```

If the upgrade installed a kernel, `sudo reboot` before going on.

Fill in `deploy/.env` — the example already carries the domain, Brevo's server
and port and the sender. **Write the two secrets straight into the file**, so
they never appear on a screen (or in a terminal somebody else can read):

```sh
sed -i "s|^DJANGO_SECRET_KEY=.*|DJANGO_SECRET_KEY='$(openssl rand -base64 48 | tr -d '\n')'|" deploy/.env
sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -hex 32)|" deploy/.env
```

Neither alphabet contains a `$`, so Part 1's Compose trap cannot spring. Then,
with `nano deploy/.env`:

- `ACME_EMAIL` — your own address; Let's Encrypt writes there about expiry.
- `EMAIL_HOST_USER` and `EMAIL_HOST_PASSWORD` — Brevo's SMTP login and SMTP
  key from step 3, the key between single quotes. They can stay empty for the
  first start: the site runs without mail, and an approval then fails in plain
  sight rather than half-way (TD-38).

`docker compose -f deploy/docker-compose.yml --env-file deploy/.env config --quiet`
checks the file without printing it. Then continue with Part 1 from *Then
start it*: the first start, the logs, the first admin and its `role`. Nothing
but SSH, 80 and 443 listens on the public address — `db` and `api` publish no
ports — so there is no other door to close. Filling the mail in later needs
only `up -d` again: Compose recreates the one container whose environment
changed.

### 5. Prove it works, as a collaborator would

1. `https://viveregaeta.it/benvenuto` opens with a valid certificate, and both
   `http://` and `www.` land on it.
2. **One message, before the journey**, so a mail problem is not mistaken for
   an onboarding one (`None` means `DEFAULT_FROM_EMAIL`; it prints `1`):

   ```sh
   docker compose -f deploy/docker-compose.yml --env-file deploy/.env exec api python manage.py shell -c "from django.core.mail import send_mail; print(send_mail('Prova Vivere Gaeta', 'Se leggi questo, la posta funziona.', None, ['you@example.org']))"
   ```
3. **The whole onboarding, with the real provider:** file a *Collabora con
   noi* request from the site with a second address of yours, approve it in
   `/admin/`, and the invite must arrive **in the inbox**. In Gmail, *Show
   original* should say `DKIM: PASS` and `DMARC: PASS`. Follow the link, set
   the password, sign in.
4. Ask for a password reset once, and use it.

### 6. Then: the content, and the backups

- **The content is written in the app**, by the author and the collaborators,
  and nothing is loaded by a command on the server. *(Until 2026-10-22 this
  step loaded public-source drafts with `seed_drafts`; the author judged them
  a trial and both were removed — see content.md's seeding section. `seed_demo`
  and `seed_e2e` are DEBUG-only and refuse to run here.)* Cards written
  outside the app go in as drafts **from the author's machine**, through the
  API: `scripts/carica-schede --dry-run <folder>`, then the same without
  `--dry-run` (since 2026-10-26; content.md, «Reinstated»). No deploy, no
  SSH — only a migration a batch needs, such as a new genre, has to be
  deployed first, and the dry run says so.
- **OVH's included backup is one copy of the last 24 hours**: a net for a dead
  disk, not a history. `deploy/backup.sh` is Part 1's two commands made safe
  to schedule — `pipefail`, so a dump that fails fails the run instead of
  leaving the 20-byte file Part 1 warns about; files renamed into place only
  when complete; 14 days kept; one line of sizes per run in the log. Run it
  once by hand and look at the sizes, then schedule it:

  ```sh
  (crontab -l 2>/dev/null; echo '0 3 * * * $HOME/local-social-network/deploy/backup.sh >> $HOME/backups/backup.log 2>&1') | crontab -
  ```

  and copy the folder off the machine regularly — to your own computer is
  enough: `rsync -av ubuntu@<IPv4>:backups/ ~/Backups/vivere-gaeta/`. The
  uploads exist nowhere else.

---

## Part 1 — a VPS with Docker Compose

### What you get

| Container | What it is | Notes |
|---|---|---|
| `web` | Caddy | terminates TLS, serves the built SPA, proxies the API |
| `api` | Django + gunicorn (3 workers) | runs the release commands on every start |
| `db` | PostgreSQL 17 | on a named volume |

**Both halves share one hostname.** `https://your-domain` serves the SPA;
`/api/`, `/admin/`, `/media/` and `/static/` are proxied to Django. That is why
`VITE_API_BASE_URL` is built empty — the SPA calls relative URLs, so there is
no second hostname, no CORS to get wrong, and one certificate.

### Before you start

- A VPS with a public IP. The smallest tier of anything is enough: this is a
  small Django app and a Postgres, not a cluster.
- A domain **whose A record already points at that IP**. Do this first and let
  it propagate: Caddy asks Let's Encrypt for a certificate on first start, and
  that only works if the name already resolves to the machine.
- Ports **80 and 443** open. 80 is not optional — the certificate challenge
  uses it.
- Docker with the Compose plugin (`curl -fsSL https://get.docker.com | sh`).

### Steps

```sh
git clone https://github.com/pastorello/local-social-network.git
cd local-social-network
cp deploy/.env.example deploy/.env
```

Fill in `deploy/.env`. Generate the secret key with:

```sh
docker run --rm python:3.14-slim sh -c "pip install -q django && python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'"
```

**Put the key between single quotes** in `.env` — `DJANGO_SECRET_KEY='…'`.
The generator above draws from a set of characters that includes `$`, and
Compose reads an unquoted `$abc` inside a value as a variable: the key reaches
Django with that piece cut out, and the only sign is one warning line in the
log. About two keys in three contain a `$`. Checked on 2026-09-10 with
`docker compose config`, which shows what the containers will actually receive.

Then start it:

```sh
docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build
```

First start takes a few minutes: it builds both images, waits for Postgres,
runs the migrations, creates the cache table, collects the static files, and
gets a certificate. Watch it with:

```sh
docker compose -f deploy/docker-compose.yml --env-file deploy/.env logs -f
```

Create the first admin — there is no other way in, since v2 has no public
signup and every account is created by an admin approving a request (spec A2):

```sh
docker compose -f deploy/docker-compose.yml --env-file deploy/.env exec api \
  python manage.py createsuperuser --email you@example.org
```

It asks for the password without echoing it, so it ends up neither on the
screen nor in the shell's history — which a password typed into a `shell -c`
line, as this guide printed until 2026-10-22, did. Then give the account the
product's **role** and a name: superuser status opens Django admin, while the
app's own permissions read `User.role` (spec F1.3). It prints `1`:

```sh
docker compose -f deploy/docker-compose.yml --env-file deploy/.env exec api \
  python manage.py shell -c "from account.models import User; print(User.objects.filter(email='you@example.org').update(role='admin', name='Your name'))"
```

### Updating

```sh
git pull
docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build
```

Migrations, the cache table and `collectstatic` run on every start, because all
three are idempotent and forgetting one is the failure mode.

Run it **from the repository's root**: the paths are relative, and from anywhere
else Compose answers `couldn't find env file` and changes nothing. Walked on
2026-09-10 against a live stack with data in it — `api` and `web` were rebuilt
and recreated, `db` and its volume were left alone, the second start printed
`No migrations to apply` and re-collected the static files, and the card and
photo uploaded before the update were still there after it.

**Back up first, and pull before you do** (2026-10-26, release 2.0.0). The
order that worked: `git pull` — it changes files, not the running containers
— then `deploy/backup.sh`, then the `up -d --build` above. Pulling first
matters on an install older than #114, the commit that added the script: on
2026-10-26 the VPS still ran the 2026-10-22 install and had no
`deploy/backup.sh` until it pulled. Safe because the Compose project's name,
`vivere-gaeta`, has not changed since August, so the rebuilt stack comes back
on the same `postgres_data` and `media` volumes.

**A release is tagged on the commit production runs.** `v2.0.0` (553a6c8)
was tagged and published as a GitHub release only once the VPS served it —
checked from outside, by reading the public API and the JavaScript it sends.
The release notes say what changed for a reader and a collaborator and how to
deploy it over the previous install.

### Backups — the two things that are not in git

```sh
# database
docker compose -f deploy/docker-compose.yml --env-file deploy/.env exec -T db \
  sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > backup-$(date +%F).sql.gz

# uploads (photos, card covers, overlay rasters)
docker run --rm -v vivere-gaeta_media:/media -v "$PWD":/out alpine \
  tar czf /out/media-$(date +%F).tar.gz -C /media .
```

**The single quotes around `pg_dump` are the whole point.** `POSTGRES_USER` and
`POSTGRES_DB` exist inside the container, not in the shell you type into.
Without the quotes your shell expands them to nothing, `pg_dump` connects as
`root` and fails — and `gzip` still writes a 20-byte file and exits 0. A
scheduled backup in that shape reports success every night and contains
nothing. This guide printed it that way until 2026-09-10, when running it
turned the problem up. **Check the size of the first backup you take**; a real
one of an empty archive is several kilobytes and lists every table.

Losing the `media` volume loses every photo, and nothing else has a copy. Put
both on a schedule before the archive has anything in it worth losing. Both
commands were run against a live stack on 2026-09-10, and a photo taken out of
the media archive matched the one the site served, byte for byte. `deploy/backup.sh` is
the two of them made safe for cron — step 6 of *The setup chosen on
2026-10-21* has the line to schedule.

### What will bite you

- **DNS after the fact.** If the domain did not resolve at first start, Caddy
  failed the challenge and will keep retrying with a backoff. Fix the DNS, then
  `docker compose ... restart web`.
- **Rotating `DJANGO_SECRET_KEY`** logs everyone out: it also signs the JWTs.
- **No SMTP, no invitations.** Approving a collaboration request sends an
  e-mail with a single-use link, and that is the only way a collaborator ever
  sets a password. Without a mail server that answers, approval now **fails in
  plain sight**: the admin says the invite was not sent, no account is created,
  and the request stays pending so it can be approved again once mail works.
  Until 2026-09-10 it was worse than this guide said — the account was created,
  the admin answered 500, and every later approval was refused with "esiste già
  un account", so the person could never get in. Password reset has the same
  dependency and now answers the same way for every address even when mail is
  down; before, a 500 for a registered address gave away who has an account.
- **When something answers 500, the reason is in the logs.**
  `docker compose -f deploy/docker-compose.yml --env-file deploy/.env logs api`
  shows the full traceback of any server error. Only errors are written — not
  the 404s every public host collects — so it stays readable. Until 2026-09-10
  a production 500 left nothing behind but its status code (TD-40).
- **`docker compose down -v` deletes the volumes**, including uploads and the
  certificates. `down` without `-v` is the safe one.

---

## Part 2 — anything else

Platform-agnostic notes, still true wherever this runs.

### What gets deployed

| Piece | Artifact | Serves |
|---|---|---|
| API | Django + gunicorn (`backend/`) | `/api/...`, `/admin/`, uploaded media |
| Frontend | static Vite build (`frontend/dist/`) | the SPA, from any static host/CDN |
| Database | PostgreSQL 17 | set `POSTGRES_*` env vars |

If the two are split across hostnames, the SPA reads its API base URL from
`VITE_API_BASE_URL` **at build time**, and the backend allowlists the SPA
origin via `CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS`.

### Backend checklist

Environment (see `.env.example`):

- `DJANGO_SECRET_KEY` — fresh random value. **Required**: with `DJANGO_DEBUG=false`
  the app raises `ImproperlyConfigured` at startup rather than falling back to a
  shared key, because this is also what signs JWTs (TD-11)
- `DJANGO_DEBUG=false` — also enables the HTTPS hardening block in
  `settings.py` (HSTS, secure cookies, SSL redirect behind `X-Forwarded-Proto`)
- `DJANGO_ALLOWED_HOSTS` — the API hostname
- `CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS` — the SPA origin (https)
- `WEBSITE_URL` — public base URL of the API (absolute media URLs)
- `FRONTEND_URL` — public base URL of the SPA (invite/password-reset e-mail
  links, spec A3/A4 — these routes are in the frontend, not the API)
- `POSTGRES_HOST/PORT/DB/USER/PASSWORD`

Rate limiting (TD-18) counts through the Django cache. Outside dev and tests
`settings.py` configures the **database cache**, which is shared by every
worker and every container — verified by three separate processes counting 1,
2, 3 through it, where `LocMemCache` gave each of them 1. Swap in Redis by
pointing `CACHES` at one when there is a Redis to point at; the throttles do
not care which backend counts for them.

**`createcachetable` is part of the release, not optional.** Without the table
the first throttled request errors instead of throttling.

Release commands:

```sh
python manage.py migrate
python manage.py createcachetable          # the shared cache the throttles count in
python manage.py collectstatic --noinput   # whitenoise serves the result
gunicorn backend.wsgi --bind 0.0.0.0:8000 --workers 2
```

Static files (Django admin) are served by **whitenoise** — no web server needed
in front for them.

**Media uploads** (report photos, card images and covers, overlay rasters) are
served by the app itself — `common/media.py`, decided in
[ADR-0007](./adr/0007-serving-media-from-the-app.md). No object storage and no
web server in front are required, on any host. Only `.jpg`, `.png` and `.webp`
are served, with the `Content-Type` taken from that allowlist rather than
guessed, plus `nosniff` and a sandboxing CSP — which is what makes it
acceptable to serve uploads from the origin that holds the admin session
cookie.

**Give the service a persistent disk** (`MEDIA_ROOT`). That part of
[ADR-0003](./adr/0003-media-on-local-filesystem.md) stands: an ephemeral disk
loses every upload on redeploy.

Create the first admin (spec F1.3 — promotion happens via Django admin):

```python
# python manage.py shell
from account.models import User
User.objects.create_superuser(email="...", password="...", name="admin")
```

### Frontend checklist

```sh
VITE_API_BASE_URL=https://api.example.org npm run build   # emits frontend/dist/
```

Deploy `dist/` to any static host. Configure the host to rewrite unknown paths
to `/index.html` (the router uses HTML5 history mode).
