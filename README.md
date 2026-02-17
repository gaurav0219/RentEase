# 🏠 RentEase

A complete rental property management platform built with **NestJS** + **Next.js**.

Manage properties, rooms, tenants, applications, agreements, documents, and notifications — all in one place.

## Tech Stack

| Layer     | Technology                        |
|-----------|-----------------------------------|
| Frontend  | Next.js 16, TypeScript, CSS       |
| Backend   | NestJS, Prisma ORM, PostgreSQL    |
| Auth      | JWT (access + refresh tokens)     |
| Database  | PostgreSQL                        |

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/gaurav0219/RentEase.git
cd RentEase

# 2. Backend setup
cd backend
npm install
cp .env.example .env        # edit with your DB URL
npx prisma migrate dev
npm run start:dev

# 3. Frontend setup (new terminal)
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

## Features

### For Property Owners
- Add and manage properties & rooms
- Review tenant applications (approve/reject)
- Generate rent agreements with PDF download
- Verify or reject tenant documents
- Notification preferences

### For Tenants
- Browse available rooms and apply
- Upload identity documents
- View and download agreements
- Receive notifications on application updates

## Project Structure

```
RentEase/
├── backend/          # NestJS API server
│   ├── src/
│   │   ├── auth/          # JWT authentication
│   │   ├── properties/    # Property CRUD
│   │   ├── rooms/         # Room management
│   │   ├── tenants/       # Tenant profiles
│   │   ├── applications/  # Application workflow
│   │   ├── agreements/    # Rent agreements
│   │   ├── documents/     # Document management
│   │   ├── notifications/ # Notification system
│   │   └── users/         # User settings & profile
│   └── prisma/            # Database schema & migrations
│
├── frontend/         # Next.js dashboard
│   └── src/
│       ├── app/           # Pages & layouts
│       └── lib/           # API client & auth context
│
└── docker-compose.yml
```

## Author

**Gaurav** — [@gaurav0219](https://github.com/gaurav0219)

## License

MIT
