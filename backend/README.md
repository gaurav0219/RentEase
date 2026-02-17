# RentEase — Backend API

A full-featured rental property management backend built with **NestJS**, **Prisma**, and **PostgreSQL**.

## Features

- 🔐 **Authentication** — JWT-based registration, login, token refresh
- 🏠 **Property Management** — CRUD for properties and rooms
- 👥 **Tenant Management** — Tenant profiles, approval workflow
- 📨 **Applications** — Tenants apply for rooms, owners review
- 📄 **Agreements** — Auto-generated rent agreements with PDF download
- 📁 **Documents** — Upload, verify, reject tenant documents
- 🔔 **Notifications** — Settings-aware in-app notification system
- ⚙️ **User Settings** — Notification preferences, theme, language
- 📝 **Audit Logs** — Full action tracking

## Tech Stack

- **Framework**: NestJS (Node.js)
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: JWT (access + refresh tokens)
- **File Uploads**: Multer

## Setup

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your database URL

# Run migrations
npx prisma migrate dev

# Start development server
npm run start:dev
```

The server runs on `http://localhost:3001`.

## API Endpoints

| Module          | Endpoints                              |
|-----------------|----------------------------------------|
| Auth            | POST `/api/auth/register`, `/login`, `/refresh` |
| Properties      | CRUD `/api/properties`                 |
| Rooms           | CRUD `/api/rooms`                      |
| Tenants         | GET/PATCH `/api/tenants`               |
| Applications    | POST/GET/PATCH `/api/applications`     |
| Documents       | Upload, verify, reject `/api/documents`|
| Agreements      | CRUD + download `/api/agreements`      |
| Notifications   | GET, mark-read, delete `/api/notifications` |
| Users/Settings  | Profile, password, settings `/api/users` |

## Author

- **Gaurav** — [@gaurav0219](https://github.com/gaurav0219)

## License

MIT
