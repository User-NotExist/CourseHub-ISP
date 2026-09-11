# ---- CourseHub Backend (FastAPI) ----
# Build context must be the REPO ROOT (requirements.txt lives there, not in backend/)
# Example: docker build -f backend/Dockerfile -t coursehub-backend .

FROM python:3.14.2-slim

WORKDIR /app

# System deps needed to build some Python wheels (safe default, small footprint)
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy the backend source
COPY . .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
