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
- main.py creates FastAPI app, adds SessionMiddleware and CORS, calls base.metadata.create_all(bind=engine), and includes routers from auth.py and course.py.
- Add new routes via APIRouter and include in main.py.

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
- database.get_db yields a SQLAlchemy Session; use Depends(get_db) in endpoints.
- engine = create_engine(url, echo=True) — SQL logging enabled.
- base.metadata.create_all(bind=engine) is used at startup (no migration tool present).
- Models use relationships (back_populates). Deletions are done manually in code (no ON DELETE CASCADE), so ensure to delete dependent rows explicitly.

Models summary (important fields)
- User: user_id (int PK), user_email unique, name, is_admin
- Course: course_id (12-char str PK), three unique join codes (lecturer/ta/student)
- CourseMember: links users to courses with role string ("lecturer", "ta", "student")

Conventions & important patterns
- Authz: verify user by decoding cookie JWT and then check DB for User and CourseMember role.
- Role checks: route-level manual checks (e.g., only lecturer can edit/delete). Replicate exactly when adding endpoints.
- ID generation: courses use secrets.choice to create non-guessable short IDs; preserve uniqueness constraints when creating.
- No central service layer — routes interact directly with the DB session and ORM models.
- Error handling: raise fastapi.HTTPException with appropriate status codes and messages.
- Pydantic models defined inline in route files for request validation.

Security notes for agents
- Never commit secrets (.env values) into repo. Use environment variables in CI/deploy.
- Do not relax COOKIE_SECURE in production.
- JWT tokens are stored in httponly cookies; avoid reading them client-side.
- Keep ALLOWED_DOMAIN check for Google sign-ins.

Operational
- Local run: python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 (ensure env vars set)
- Install: pip install -r requirements.txt
- When changing models, consider adding a migration strategy (Alembic) — currently create_all is used.

Limitations & gotchas
- No automated DB migrations — altering models will not migrate existing DB schema.
- Queries are synchronous SQLAlchemy ORM; endpoints are declared async but perform blocking DB calls; this is acceptable but may limit concurrency. Consider async DB engine if scaling.
- Deletions must explicitly remove dependent rows (code currently deletes Task/Activity/Faq/Comments/CourseMember then Course).
- engine echo=True will log SQL in stdout; may expose sensitive queries in logs.

Where to extend
- Add a service/repository layer to centralize DB logic.
- Add Alembic for schema migrations.
- Add tests and CI.

Contact
- Current maintainer: inspect root .env for dev contact (DO NOT commit secrets)

Coaching for other agents
- Follow existing patterns: use Depends(get_db), decode access_token from Cookie, verify user and roles in each endpoint.
- Avoid changing global startup behavior (create_all) unless adding migrations.
- Respect security env vars and do not enable COOKIE_SECURE=false in production.
