# Feedback Hub (B2B SaaS)

A full-stack, B2B Micro-SaaS boilerplate and production-ready application for collecting, triaging, and analyzing customer feedback using AI.

## Features

- **FastAPI Backend**: Async, type-safe, and high-performance backend using Python 3.11+.
- **PostgreSQL**: Robust database managed with SQLAlchemy 2.0 (async) and Alembic migrations.
- **React Frontend**: Built with Vite, TypeScript, Tailwind CSS, Shadcn UI, and TanStack Query.
- **Tenant Isolation**: Secure organization-level isolation with proper role management (Owner, Admin, Member).
- **Stripe Billing Integration**: End-to-end subscription flow via webhooks, usage limits, and checkout sessions.
- **Asynchronous AI Triage**: Incoming feedback is automatically tagged (category & sentiment) in the background via OpenAI (`gpt-4o-mini`).
- **Public Ingestion API & Web Widget**: API key-secured ingestion endpoint protected by `slowapi` rate limiting, complete with a vanilla JS embeddable widget for customers to install on their sites.

## Quick Start (Docker)

To run the entire stack (Database, Backend, Frontend) locally:

```bash
# Start all containers
docker-compose up -d --build
```

- The API is available at `http://localhost:8000` (docs at `/docs`)
- The Frontend is available at `http://localhost:5173`

## Configuration

Duplicate `.env.example` (or set up `.env`) in the root directory:

```env
# Database
DATABASE_URL=postgresql+asyncpg://saas:saas_dev_password@db:5432/saas_db
DATABASE_URL_SYNC=postgresql://saas:saas_dev_password@db:5432/saas_db

# Security & JWT
JWT_SECRET=your_secret_here
JWT_ALGORITHM=HS256

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# AI Configuration (Optional, fallback enabled)
OPENAI_API_KEY=sk-...
```

## Running without Docker

You can also run the components individually:

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Or venv\Scripts\activate on Windows
pip install -r requirements.txt
alembic upgrade head
fastapi dev app/main.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```
