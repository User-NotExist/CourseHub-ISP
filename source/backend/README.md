# CourseHub backend

FastAPI service for Google authentication, courses, tasks, and course activities.
It uses synchronous SQLAlchemy sessions and PostgreSQL.

## Configuration

Set environment variables or create a `.env` file in `source/backend` before
starting the application. Existing environment variables take precedence over
values loaded from `.env`.

| Variable | Purpose | Default |
| --- | --- | --- |
| `DATABASE_URL` | SQLAlchemy database connection URL; PostgreSQL is used for deployment. | None; required at startup. |
| `JWT_SECRET_KEY` | Signs session cookies and access tokens. | None; must be configured. |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID. | None; required for Google sign-in. |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret. | None; required for Google sign-in. |
| `GOOGLE_REDIRECT_URI` | Backend callback URL ending in `/auth/callback`, registered with Google. | None; required for Google sign-in. |
| `FRONTEND_URL` | Allowed CORS origin and base URL for the redirect to `/courses` after login. | `http://localhost:3000` |
| `COOKIE_SECURE` | Sets the `Secure` flag on the access-token cookie when its value is `true` (case-insensitive). | `false` |

Use `COOKIE_SECURE=true` when serving the backend over HTTPS.

Google sign-in requires an email marked as verified by Google whose domain is
`ku.th`. Access tokens are signed with HS256, expire after one day, and are stored
in the HTTP-only `access_token` cookie with `SameSite=lax` and path `/`.

## Running locally

From the repository root, create and activate a virtual environment:

```sh
cd source/backend
python3 -m venv .venv
source .venv/bin/activate
```

Install dependencies and start the service from `source/backend`:

```sh
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Both Dockerfiles use the same `app.main:app` entry point.

The database must be reachable when the application starts. Importing
`app.main` calls `base.metadata.create_all(bind=engine)` to create missing tables.
This does not migrate existing tables when ORM definitions change; database
migrations are not configured in this project.

FastAPI's API documentation is available at `/docs` and `/redoc`, with the OpenAPI
document at `/openapi.json`.

## Structure

```text
backend/
├── app/
│   ├── main.py             # Middleware, table registration, router assembly
│   ├── database.py         # SQLAlchemy engine, base, and get_db dependency
│   ├── models.py           # ORM tables and relationships
│   ├── core/
│   │   ├── config.py       # Environment settings loaded once
│   │   ├── security.py     # JWT creation and authenticated user lookup
│   │   ├── oauth.py        # Google OAuth client
│   │   └── identifiers.py  # Secure course ID and join code generation
│   ├── routers/            # HTTP handlers for auth, courses, tasks, activities
│   ├── schemas/            # Pydantic request and response models
│   └── services/           # Business rules, permissions, and database operations
├── requirements.txt       # Python dependencies
├── Dockerfile             # Production image and startup command
└── Dockerfile.dev          # Development image with Uvicorn reload
```

Routers keep paths, methods, parameter declarations, response models, and cookie
handling close to the HTTP boundary. Services implement course, task, and activity
operations, including permissions and database changes, and Google-user
registration. Shared membership queries live in
`services/permissions.py`; course and task response dictionaries are mapped in
`services/serializers.py`.

This separates the public API from its implementation and removes repeated JWT
decoding, membership queries, and response dictionaries. SQLAlchemy is used
directly in services; there is no separate repository layer. ORM models remain
together because their size and relationships do not currently justify splitting
them further.

Import backend modules from `app` directly. Application startup uses
`app.main:app`.
