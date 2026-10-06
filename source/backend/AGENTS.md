# AGENTS - backend

Purpose
- Agent guidance for the source/backend FastAPI service: auth, course management, and DB models.

Stack
- FastAPI + Uvicorn
- SQLAlchemy (declarative) without migrations
- PostgreSQL (DATABASE_URL)
- OAuth via authlib and JWTs with python-jose
- dotenv for env vars

Entry points & routing
- Uvicorn and Docker use app.main:app directly; there are no top-level compatibility modules.
- app/main.py creates FastAPI, adds SessionMiddleware and CORS, calls base.metadata.create_all(bind=engine), and includes routers from app/routers/.
- Add new routes via APIRouter in app/routers/ and include in app/main.py.

Environment (required)
- DATABASE_URL: SQLAlchemy DB URL
- JWT_SECRET_KEY: used for SessionMiddleware and JWT signing
- GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
- FRONTEND_URL, COOKIE_SECURE ("true"/"false")

Auth flow & cookies
- OAuth2 with Google; only allow ku.th domain (ALLOWED_DOMAIN).
- After login, server creates JWT (sub=user_id) and sets it in an httponly cookie named `access_token`.
- Endpoints read this cookie (Cookie dependency) and decode with JWT_SECRET_KEY & HS256.
- COOKIE_SECURE must be true in production (HTTPS).

Database patterns
- app.database.get_db yields a SQLAlchemy Session; use Depends(get_db) in endpoints.
- engine = create_engine(url, echo=True) — SQL logging enabled.
- base.metadata.create_all(bind=engine) is used at startup (no migration tool present).
- Models use relationships (back_populates). Deletions are done manually in code (no ON DELETE CASCADE), so ensure to delete dependent rows explicitly.

Models summary (important fields)
- User: user_id (int PK), user_email unique, name, is_admin
- Course: course_id (12-char str PK), three unique join codes (lecturer/ta/student)
- CourseMember: links users to courses with role string ("lecturer", "ta", "student")

Conventions & important patterns
- Authz: use app.core.security.authenticated_user to decode the cookie JWT and look up User. Preserve the endpoint's error messages and missing-user status.
- Role checks: services enforce each operation's existing permissions, using shared membership queries in app/services/permissions.py. Replicate existing policies exactly when adding endpoints.
- ID generation: courses use secrets.choice to create non-guessable short IDs; preserve uniqueness constraints when creating.
- Business logic and ORM operations live in app/services/; routers handle HTTP input/output and delegate to services.
- Error handling: raise fastapi.HTTPException with appropriate status codes and messages.
- Pydantic request/response models live in app/schemas/. ORM definitions live in app/models.py.

Security notes for agents
- Never commit secrets (.env values) into repo. Use environment variables in CI/deploy.
- Do not relax COOKIE_SECURE in production.
- JWT tokens are stored in httponly cookies; avoid reading them client-side.
- Keep ALLOWED_DOMAIN check for Google sign-ins.

Operational
- Local run: python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 (ensure env vars set)
- Install: pip install -r requirements.txt
- When changing models, consider adding a migration strategy (Alembic) — currently create_all is used.

Limitations & gotchas
- No automated DB migrations — altering models will not migrate existing DB schema.
- Queries are synchronous SQLAlchemy ORM; endpoints are declared async but perform blocking DB calls; this is acceptable but may limit concurrency. Consider async DB engine if scaling.
- Deletions must explicitly remove dependent rows (code currently deletes Task/Activity/Faq/Comments/CourseMember then Course).
- engine echo=True will log SQL in stdout; may expose sensitive queries in logs.

Where to extend
- Extend app/services/ for business rules; keep app/routers/ focused on the public HTTP contract.
- Add Alembic for schema migrations.
- Run python -m unittest discover -s testsuite -v for API regressions. Tests use isolated SQLite and mocked OAuth; keep CI independent of production secrets.
- The original OpenAPI snapshot in testsuite/fixtures/openapi.json guards all 19 endpoints. Review any intentional API changes before updating it.

Contact
- Current maintainer: inspect root .env for dev contact (DO NOT commit secrets)

Coaching for other agents
- Follow existing patterns: use Depends(get_db), decode access_token from Cookie, verify user and roles in each endpoint.
- Avoid changing global startup behavior (create_all) unless adding migrations.
- Respect security env vars and do not enable COOKIE_SECURE=false in production.
