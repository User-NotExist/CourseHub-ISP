# CONTRIBUTING

## Project structure

- `course/backend/` — Python API service
- `course/coursehub/` — Next.js frontend app
- `course/docker-compose.yml` — Container setup for deployment
- `Jenkinsfile` — Instructions for deployment pipeline
- `README.md` — project information.

## Local development

### Backend

```bash
cd course/backend
python -m venv venv

# Windows PowerShell
.\venv\Scripts\Activate.ps1

# macOS / Linux
# source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn main:app --reload
```

### Frontend

```bash
cd course/coursehub
npm install
npm run dev
```

## Branching workflow

Create a new branch for every feature, fix, or documentation update before making changes.

```bash
git checkout main
git pull origin main
git checkout -b feature/your-change-name
```

Recommended branch names:

- `feature/...` for new features
- `fix/...` for bug fixes
- `docs/...` for documentation updates
- `chore/...` for cleanup and maintenance

## Development guidelines

- Keep pull requests focused on one task or issue.
- Write clear and descriptive commit messages.
- Update relevant documentation when behavior changes.
- Test locally before opening a PR.
- Avoid unrelated formatting changes in the same PR.

## Creating a pull request to `main`

When your work is ready, push your branch and open a PR targeting the `main` branch.

```bash
git add .
git commit -m "Describe your change"
git push -u origin feature/your-change-name
```

Then in GitHub:

1. Open the repository.
2. Go to the Pull requests tab.
3. Click New pull request.
4. Set the base branch to `main`.
5. Set the compare branch to your feature branch, such as `feature/your-change-name`.
6. Review the diff and confirm it contains only the intended changes.
7. Add a clear title and summary.
8. Click Create pull request.

Important: when creating a PR from another branch, always confirm the PR is targeting `main` as the base branch. If the base branch is not `main`, change it before creating the pull request.

## PR checklist

Before requesting review, confirm:

- Your branch is based on the latest `main`
- The PR target is `main`
- The description explains what changed and why
- The change was tested locally
- Build test passed
