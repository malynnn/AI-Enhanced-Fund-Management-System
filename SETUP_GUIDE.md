# Developer Setup Guide

Welcome to the Finance System Capstone project! Follow these instructions to get your local development environment up and running after pulling the latest changes.

## Prerequisites

Before you begin, ensure you have the following installed on your machine:

1. **Node.js** (v18 or higher): [Download Node.js](https://nodejs.org/)
2. **Docker Desktop**: Required to run PostgreSQL and RabbitMQ locally without complex installations. [Download Docker](https://www.docker.com/products/docker-desktop/)
3. **Git**: [Download Git](https://git-scm.com/)

---

## 1. Install Dependencies

The project is split into a Next.js frontend (`my-app`) and an NX monorepo backend (`backend`). You need to install dependencies for both.

Open your terminal and run:

```bash
# 1. Install backend dependencies
cd backend
npm install

# 2. Install frontend dependencies
cd ../my-app
npm install
```

---

## 2. Start the Infrastructure (Docker)

We use Docker to run the database (PostgreSQL) and the message broker (RabbitMQ) needed by the microservices.

1. Ensure **Docker Desktop** is open and running on your machine.
2. Open a terminal in the `backend` folder.
3. Start the containers in the background:

```bash
cd backend
docker-compose up -d
```

*This will download the required images and start a PostgreSQL instance (port 5432) and RabbitMQ (ports 5672/15672).*

---

## 3. Database Setup & Seeding

Once the database container is running, you need to apply the database schema and populate it with initial data.

1. Open a terminal in the `backend/libs/prisma` folder.
2. Push the schema to the database and generate the Prisma Client:

```bash
cd backend/libs/prisma
npx prisma db push
npx prisma generate
```

3. Seed the database with initial mock data (optional but recommended):

```bash
node seed.js
```

---

## 4. Run the Backend Microservices

The backend is built as a set of microservices managed by NX. You can start all of them concurrently with a single command.

1. Open a terminal in the `backend` folder.
2. Start all microservices:

```bash
cd backend
npx nx run-many --target=serve --all
```

*This will start the API Gateway (`fs-gateway`) on port 3001, and all other microservices on their respective ports (3002, 3003, 3004, 3005).*

---

## 5. Run the Frontend Application

Finally, start the Next.js frontend application.

1. Open a **new terminal** and navigate to the `my-app` folder.
2. Start the development server:

```bash
cd my-app
npm run dev
```

The application should now be accessible at **[http://localhost:3000](http://localhost:3000)**. 

### Logging In
You can log in using the mock authentication flow. Use the following roles by typing them into the Email/Employee ID field (any password works):
- `superadmin@bdoea.com` (Superadmin)
- `admin@bdoea.com` (Officer/Admin)
- `user@bdoea.com` (User)

Happy coding! If you encounter any issues, ensure Docker is running properly and that the ports (`3000`, `3001-3005`, `5432`, `5672`) are not occupied by other applications on your system.
