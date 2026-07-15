# RealHaven API

Node/Express + MongoDB + Cloudinary backend for the RealHaven frontend.

## Setup

```bash
cd server
cp .env.example .env       # fill in Mongo URI + Cloudinary creds
npm install
npm run dev
```

The API runs on `http://localhost:5000/api`. In the frontend project root, create
a `.env` with:

```
VITE_API_URL=http://localhost:5000/api
```

## Endpoints

- `POST /api/auth/signup` — `{ name, email, password, role, phone? }` → `{ token, user }`
- `POST /api/auth/login` — `{ email, password }` → `{ token, user }`
- `GET  /api/properties?q=&city=&type=&status=&min=&max=` → `{ properties }`
- `GET  /api/properties/mine` (agent) → `{ properties }`
- `GET  /api/properties/:id` → `{ property }` (increments view count)
- `POST /api/properties` (agent, multipart) — fields + `images[]` (up to 6)
- `DELETE /api/properties/:id` (agent, owner only)
- `POST /api/inquiries` (buyer) — `{ property, message }`
- `GET  /api/inquiries/mine` (buyer)
- `GET  /api/inquiries/received` (agent)

Auth via `Authorization: Bearer <token>` header.
