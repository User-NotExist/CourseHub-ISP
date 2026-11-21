# CourseHub

A platform that centralizes course tasks, announcements, and FAQs to keep lecturers and TAs in sync.

# Group Members
- Krittitee Chaisang 6810545441 [Kongbeng-21](https://github.com/Kongbeng-21)
- Pasin Makcharoen 6810545794 [Pasin0931](https://github.com/Pasin0931)
- Phirawit Sommaichaiya 6810545832 [FeuxFollet](https://github.com/FeuxFollet)
- Pichaya Yawiset 6810545824 [User-NotExist](https://github.com/User-NotExist/)
- Techasit Suchatsunthon 6810545590 [iimtec](https://github.com/iimtec)

# Project Status
<span style="color:green">On support: No new features.</span>

# Docs
Located in folder **/docs** of this project.

# Diagram
Located in folder **/docs/diagrams** of this project.

# Deployment

CourseHub runs as two Docker containers defined in `source/docker-compose.yml`:

| Service    | Container            | Port                         | Notes                                                       |
|------------|----------------------|------------------------------|-------------------------------------------------------------|
| `frontend` | `coursehub-frontend` | `3000` (published)           | Next.js app. Every browser request goes through it.         |
| `backend`  | `coursehub-backend`  | `8000` (internal only)       | FastAPI. Only the frontend can reach it, over `coursehub-net`. |

It relies on four external services: **PostgreSQL (Supabase)**, **Google OAuth**, **Resend** (email), and
**Jenkins** (CI/CD). Set them up first (steps 1–3), then deploy (steps 4–6).

## Prerequisites

- A Linux server with [Docker Engine](https://docs.docker.com/engine/install/) and the Docker Compose plugin (`docker compose version`).
- A domain name pointing at the server, e.g. `coursehub.example.com`. Google OAuth and secure cookies need HTTPS.
- Access to the domain's DNS, so you can verify it with Resend.

## 1. Database: PostgreSQL on Supabase

Any PostgreSQL database works. These steps use [Supabase](https://supabase.com).

1. Create a new project in the Supabase dashboard and save the database password.
2. Click **Connect** and copy the **Session pooler** connection string (port `5432`). The direct connection is
   IPv6-only on the free tier, and many servers and Docker networks can't reach it.
3. Put the password into the string and use the result as `DATABASE_URL`:
   ```
   DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
   ```

The backend creates its tables on startup (`base.metadata.create_all` in `source/backend/main.py`), so the
schema needs no manual setup. `create_all` only creates **missing** tables and never alters existing ones. If
you change a model's columns later, apply that change to the database yourself.

## 2. Login: Google OAuth

Only Google accounts ending in `@ku.th` can log in (`ALLOWED_DOMAIN` in `source/backend/auth/auth.py`).

1. Open [Google Cloud Console](https://console.cloud.google.com/), then create or select a project.
2. Go to **APIs & Services → OAuth consent screen** (Google Auth Platform):
   - Fill in the app name, support email, and developer contact.
   - Scopes: `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`.
   - Audience: use **External** and **publish** the app. While it is in *Testing*, only the listed test users can
     log in. Use **Internal** only if the Cloud project belongs to the `ku.th` Workspace organization.
3. Go to **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized redirect URIs:
     - `https://coursehub.example.com/auth/callback` (production)
     - `http://localhost:3000/auth/callback` (local development, optional)
4. Copy the **Client ID** and **Client secret** into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

> The redirect URI points at the **frontend** (`/auth/callback`), not the backend. The frontend relays the OAuth
> steps to the backend, which is never exposed publicly. `GOOGLE_REDIRECT_URI` must match one of the registered
> URIs exactly.

## 3. Email: Resend

The backend uses [Resend](https://resend.com) to send appointment emails. **The backend will not start without
`RESEND_API_KEY`.**

1. Create a Resend account.
2. Go to **Domains → Add domain** and add your domain (or a subdomain such as `mail.example.com`).
3. Add the DNS records Resend shows (SPF/MX and DKIM) at your DNS provider, then wait until the domain status is **Verified**.
4. Go to **API Keys → Create API key** with *Sending access* and copy it into `RESEND_API_KEY`.
5. Set `SENDER_SECRET` to an address on the verified domain, e.g. `noreply@example.com`.

> Without a verified domain, Resend only lets you send from `onboarding@resend.dev` to your own account's email.
> That works for testing but cannot reach students.

## 4. Environment files

Copy each example file and fill in the values from the steps above:

```bash
cp source/backend/.env.example   source/backend/.env
cp source/coursehub/.env.example source/coursehub/.env
```

Production values for `source/backend/.env`:

| Variable               | Production value                                                       |
|------------------------|------------------------------------------------------------------------|
| `DATABASE_URL`         | Supabase session pooler URL (step 1)                                   |
| `GOOGLE_CLIENT_ID`     | From step 2                                                            |
| `GOOGLE_CLIENT_SECRET` | From step 2                                                            |
| `GOOGLE_REDIRECT_URI`  | `https://coursehub.example.com/auth/callback`                          |
| `FRONTEND_URL`         | `https://coursehub.example.com` (no trailing slash; used for CORS and the post-login redirect) |
| `JWT_SECRET_KEY`       | Long random string: `python -c "import secrets; print(secrets.token_urlsafe(64))"` |
| `COOKIE_SECURE`        | `true` (requires HTTPS)                                                |
| `RESEND_API_KEY`       | From step 3                                                            |
| `SENDER_SECRET`        | Verified sender address from step 3                                    |

Production values for `source/coursehub/.env`:

| Variable         | Production value                                                       |
|------------------|------------------------------------------------------------------------|
| `BACKEND_URL`    | `http://backend:8000` (docker-compose sets this too)                   |
| `JWT_SECRET_KEY` | **Must match** the backend's `JWT_SECRET_KEY`                          |

> **Both `.env` files are baked into the Docker images.** The backend Dockerfile copies the whole directory, and
> the frontend Dockerfile copies `.env` explicitly, so the frontend build **fails** if `source/coursehub/.env` is
> missing. Never push these images to a public registry. Rebuild the images (`--build`) after changing any value.

## 5. Deploy manually with Docker Compose

From the repository root on the server:

```bash
cd source
docker compose up -d --build --remove-orphans
```

Useful commands:

```bash
docker compose ps                  # status
docker compose logs -f backend     # follow backend logs (frontend: `logs -f frontend`)
docker compose down                # stop and remove the containers
```

### HTTPS reverse proxy

The frontend listens on port `3000` over plain HTTP. Put a reverse proxy in front of it to terminate HTTPS, and
block port `3000` from the internet with a firewall. For example, with [Caddy](https://caddyserver.com), which
obtains certificates automatically:

```caddyfile
coursehub.example.com {
    reverse_proxy localhost:3000
}
```

Any proxy (Nginx, Cloudflare, …) works if it sets `X-Forwarded-For` or `CF-Connecting-IP`. The rate limiter uses
these headers (60 requests/minute) to identify logged-out users by their real IP
(`source/coursehub/src/lib/client_ip.ts`).

## 6. Continuous deployment with Jenkins

The root `Jenkinsfile` tests the backend, lints and builds the frontend, and deploys on every build of `main`.
It runs `docker compose build && docker compose up -d` **on the Jenkins machine itself**, so Jenkins must run on
the same server as the app.

1. **Install Jenkins** on the server and give it access to Docker:
   ```bash
   sudo usermod -aG docker jenkins
   sudo systemctl restart jenkins
   ```
2. **Plugins:** install *Docker Pipeline*, *Git*, *Credentials Binding*, and *GitHub* (the GitHub plugin is for webhook triggers).
3. **Credentials:** go to **Manage Jenkins → Credentials → (global) → Add Credentials** and add two credentials
   of kind **Secret file**:

   | ID                       | File to upload                         |
   |--------------------------|----------------------------------------|
   | `coursehub-backend-env`  | Your production `source/backend/.env`  |
   | `coursehub-frontend-env` | Your production `source/coursehub/.env`|

   During the Deploy stage, Jenkins copies these files into place, builds and starts the containers, then deletes them.
4. **Job:** create a **Multibranch Pipeline** (or a *Pipeline from SCM*) for this GitHub repository, using the
   script path `Jenkinsfile`. The Deploy stage only runs when the branch is `main`.
5. **Trigger:** in the GitHub repository, go to **Settings → Webhooks** and add
   `https://<jenkins-host>/github-webhook/` (content type `application/json`, *push* events). Every merge into
   `main` then redeploys automatically.

To change a secret later, replace the matching Secret file credential in Jenkins and re-run the `main` build.

Pull requests into `main` also run `.github/workflows/build-test.yml` on GitHub Actions. It runs the same
test/lint/build checks and does a `docker compose build` with empty `.env` files, but it **does not deploy**.

## Troubleshooting

| Symptom | Likely cause |
|---------|--------------|
| Backend exits on startup with `KeyError: 'RESEND_API_KEY'` | `RESEND_API_KEY` is missing from `source/backend/.env` |
| Google shows `redirect_uri_mismatch` | `GOOGLE_REDIRECT_URI` does not exactly match a URI registered in step 2 |
| `Only @ku.th accounts are allowed to log in` | Expected: only `@ku.th` accounts can log in |
| Login succeeds, but you are immediately logged out or redirected | `JWT_SECRET_KEY` differs between the two `.env` files, or `COOKIE_SECURE=true` while the site is served over plain HTTP |
| CORS errors in the browser | `FRONTEND_URL` does not match the public URL (check the scheme and trailing slash) |
| Backend cannot connect to the database | You used Supabase's IPv6-only direct connection; use the session pooler URL |
| Appointment emails are not sent | `SENDER_SECRET` is not on a Resend-verified domain |