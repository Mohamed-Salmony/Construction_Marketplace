# Construction Marketplace Backend (Express + MongoDB)

This backend is generated to match the Next.js client under `client/`. It implements the endpoints used by the frontend services in `client/services/` and `client/lib/api.ts`.

## Tech Stack
- Express
- MongoDB (Mongoose)
- JWT Auth (bcrypt + jsonwebtoken)
- Multer + Cloudinary for file uploads
- CORS, Morgan, Cookie Parser

## Project Structure
```
/server
  /config
  /controllers
  /middlewares
  /models
  /routes
  /utils
  index.js
  package.json
  .env.example
  api_endpoints.json
  README.md
```

## Setup
1. Copy `.env.example` to `.env` and adjust values as needed.
2. Install dependencies:
```
cd server
npm install
```
3. Run the server in development:
```
npm run dev
```
The API will run on `http://localhost:4000` by default.

## Client Integration
The client uses a helper in `client/lib/api.ts` with `NEXT_PUBLIC_API_BASE_URL` to prefix API requests.
Set this in the frontend `.env.local`:
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

Endpoints are mounted under `/api`, e.g. `http://localhost:4000/api/Products`.

## Authentication
- Register: `POST /api/Auth/register`
- Login: `POST /api/Auth/login`
- Profile: `GET /api/Auth/profile` (Bearer token)
- Update Profile: `PUT /api/Auth/profile` (Bearer token)

Attach token in `Authorization: Bearer <token>` header. The client also supports cookies when `credentials: include` is used.

## Roles
Supported roles: `User`, `Admin`, `Merchant`, `Technician`, `Worker`, `Customer`.
Use `requireRoles('Admin')` etc. to protect routes.

## File Uploads
- Single file: `POST /api/uploads` with form field `file`.
- Multiple files: `POST /api/uploads/batch` with field `files`.
Requires valid Cloudinary credentials in `.env`.

## Documentation
See `api_endpoints.json` for a listing of all endpoints derived from the frontend.

## Notes
- Many routes are stubbed with in-memory responses to make the client run end-to-end. Replace stubs with real database logic as needed.
- Ensure MongoDB is running locally or update `MONGO_URI` to your cluster.
