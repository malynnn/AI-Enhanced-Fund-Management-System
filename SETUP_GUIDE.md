# Developer Setup Guide

Welcome to the **AI-Enhanced Fund Management System** capstone project! Follow these instructions to get your local development environment fully up and running after pulling the latest changes.

## Prerequisites

Before you begin, ensure you have the following installed on your machine:

1. **Node.js** (v18 or higher): [Download Node.js](https://nodejs.org/)
2. **Docker Desktop**: Required to run PostgreSQL and RabbitMQ locally. [Download Docker](https://www.docker.com/products/docker-desktop/)
3. **Python** (v3.10 or higher): Required for the AI/Data Extraction service. [Download Python](https://www.python.org/downloads/)
4. **Git**: [Download Git](https://git-scm.com/)

---

## Project Structure

The project is organized as follows:

```
AI-Enhanced-Fund-Management-System/
├── my-app/                    # Next.js frontend (port 3000)
└── backend/
    ├── apps/
    │   ├── fs-gateway/        # API Gateway / reverse proxy (port 3001)
    │   ├── dues-collection-svc/   # Dues & Collections microservice (port 3002)
    │   ├── disbursement-svc/      # Disbursements & Loans microservice (port 3003)
    │   ├── expense-budget-svc/    # Expense Vouchers, Petty Cash & Budget (port 3004)
    │   ├── ledger-accounts-svc/   # Funds, Dashboard & User Management (port 3005)
    │   └── data-extraction/       # AI Data Extraction & Analytics (Python)
    └── libs/
        └── prisma/            # Shared database schema & seeder
```

---

## 1. Install Dependencies

The project has two separate Node.js applications. Install dependencies for both.

Open your terminal and run:

```bash
# 1. Install backend (NX monorepo) dependencies
cd backend
npm install

# 2. Install frontend dependencies
cd ../my-app
npm install
```

---

## 2. Start the Infrastructure (Docker)

The system uses Docker to run the **PostgreSQL** database and **RabbitMQ** message broker required by the NestJS microservices.

1. Ensure **Docker Desktop** is open and running on your machine.
2. Open a terminal in the `backend` folder.
3. Start the containers in the background:

```bash
cd backend
docker-compose up -d
```

This starts the following services:

| Service    | Port(s)         | Credentials                              |
|------------|-----------------|------------------------------------------|
| PostgreSQL | `5432`          | user: `postgres` / password: `capstone` / db: `finance_db` |
| RabbitMQ   | `5672`, `15672` | user: `guest` / password: `guest`        |

> **RabbitMQ Management UI** is accessible at [http://localhost:15672](http://localhost:15672) (guest / guest).

---

## 3. Database Setup & Seeding

Once the PostgreSQL container is running, apply the schema and populate it with initial data.

```bash
# 1. Navigate to the Prisma library
cd backend/libs/prisma

# 2. Push the schema to the database and generate the Prisma Client
npx prisma db push
npx prisma generate

# 3. Seed the database with mock data (recommended for first-time setup)
node seed.js
```

The seeder will create funds, users, and sample transactions for all modules.

---

## 4. Configure Environment Variables

Each service has its own `.env` file. These are already present in the repository with the correct defaults for local development. Verify them if you encounter connection issues:

| Service / Module               | File                                          | Key Variables                                          |
|-------------------------------|-----------------------------------------------|--------------------------------------------------------|
| API Gateway (`fs-gateway`)    | `backend/apps/fs-gateway/.env`                | `PORT=3001`                                            |
| Dues Collection               | `backend/apps/dues-collection-svc/.env`       | `PORT=3002`, `DATABASE_URL`, `RABBITMQ_URL`, `JWT_SECRET` |
| Disbursement                  | `backend/apps/disbursement-svc/.env`          | `PORT=3003`, `DATABASE_URL`, `RABBITMQ_URL`, `JWT_SECRET` |
| Expense & Budget              | `backend/apps/expense-budget-svc/.env`        | `PORT=3004`, `DATABASE_URL`, `RABBITMQ_URL`, `JWT_SECRET` |
| Ledger & Accounts             | `backend/apps/ledger-accounts-svc/.env`       | `PORT=3005`, `DATABASE_URL`, `RABBITMQ_URL`, `JWT_SECRET` |
| Prisma (shared DB)            | `backend/libs/prisma/.env`                    | `DATABASE_URL`                                         |
| Data Extraction (Python AI)   | `backend/apps/data-extraction/.env`           | `GROQ_API_KEY`, `GROQ_MODEL`, `ANALYTICS_DB_PATH`     |
| Frontend                      | `my-app/.env`                                 | `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_GATEWAY_URL`, `GROQ_API_KEY`, `GROQ_MODEL` |

**Default `DATABASE_URL` for all backend services:**
```
postgresql://postgres:capstone@localhost:5432/finance_db?schema=public
```

**Default `RABBITMQ_URL` for all backend services:**
```
amqp://guest:guest@localhost:5672
```

---

## 5. Run the Backend Microservices

The backend is built as a set of NestJS microservices managed by NX. Start all of them with a single command.

```bash
cd backend
npx nx run-many --target=serve --all
```

This starts the following services concurrently:

| Service                | Port   | Handles                                                      |
|------------------------|--------|--------------------------------------------------------------|
| `fs-gateway`           | `3001` | API reverse proxy — routes all `/api/finance/*` requests     |
| `dues-collection-svc`  | `3002` | Dues records, collections, loan payments, contributions      |
| `disbursement-svc`     | `3003` | Loan disbursements, repayments, write-offs                   |
| `expense-budget-svc`   | `3004` | Expense vouchers, petty cash transactions, budget categories |
| `ledger-accounts-svc`  | `3005` | Funds, fund transactions, dashboard, user/admin management   |

> If you want to run a single service in isolation, use:
> ```bash
> npx nx serve <app-name>
> # e.g.: npx nx serve fs-gateway
> ```

---

## 6. Run the AI Data Extraction Service (Python)

The `data-extraction` module is a standalone **Python** service responsible for AI-powered analytics, financial forecasting, and Groq LLM advisory features.

### Install Python Dependencies

```bash
cd backend/apps/data-extraction
pip install -r requirements.txt
```

**Required packages:**
- `pandas >= 2.0.0`
- `psycopg2-binary >= 2.9.0`

### Run the Extractor

```bash
# Run extraction from the live PostgreSQL database
python main.py --source db

# Or run from CSV files for testing
python main.py --source csv --funds-csv funds.csv --tx-csv transactions.csv
```

**Optional flags:**

| Flag                | Description                                                   |
|---------------------|---------------------------------------------------------------|
| `--setup-db`        | Sets up the secure read-only DB user for the extractor        |
| `--verify-security` | Verifies the read-only permission check                       |
| `--source db/csv`   | Choose data source: live database (`db`) or CSV files (`csv`) |

> The extractor outputs an `extraction_log.json` and stores analytics data in a local `analytics.db` (SQLite) file inside the `data-extraction` folder.

---

## 7. Run the Frontend Application

Finally, start the Next.js frontend.

```bash
cd my-app
npm run dev
```

The application will be accessible at **[http://localhost:3000](http://localhost:3000)**.

---

## Logging In

Authentication is handled by **NextAuth**. Use the following credentials depending on the role you want to test:

| Role           | Email / Employee ID          | Password       |
|----------------|------------------------------|----------------|
| Superadmin     | `superadmin@bdoea.com`       | *(any value)*  |
| Officer / Admin| `admin@bdoea.com`            | *(any value)*  |
| Treasurer      | *(use a seeded treasurer)*   | *(any value)*  |
| Auditor        | *(use a seeded auditor)*     | *(any value)*  |
| Member / User  | `user@bdoea.com`             | *(any value)*  |

**Role-based access** is enforced by `middleware.ts`. Non-admin users attempting to access `/admin` routes will be redirected to `/login`.

---

## Port Reference

Ensure none of the following ports are occupied by other applications before starting the system:

| Port    | Service                        |
|---------|-------------------------------|
| `3000`  | Next.js Frontend               |
| `3001`  | fs-gateway (API Gateway)       |
| `3002`  | dues-collection-svc            |
| `3003`  | disbursement-svc               |
| `3004`  | expense-budget-svc             |
| `3005`  | ledger-accounts-svc            |
| `5432`  | PostgreSQL (Docker)            |
| `5672`  | RabbitMQ AMQP (Docker)         |
| `15672` | RabbitMQ Management UI (Docker)|

---

## Troubleshooting

- **Microservices fail to start**: Ensure Docker is running and both `postgres` and `rabbitmq` containers are healthy (`docker ps`).
- **Prisma errors on `db push`**: Confirm `DATABASE_URL` in `backend/libs/prisma/.env` is correct and the PostgreSQL container is running.
- **Frontend cannot fetch data**: Confirm the gateway is running on port `3001` and `NEXT_PUBLIC_GATEWAY_URL=http://localhost:3001` is set in `my-app/.env`.
- **Python extraction errors**: Ensure all packages from `requirements.txt` are installed and `GROQ_API_KEY` is set in `backend/apps/data-extraction/.env`.

Happy coding! 🚀
