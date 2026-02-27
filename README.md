# SentiSphere AI – Multilingual Employee Feedback Sentiment System

Production-ready prototype for a final-year project using:

- Backend: Node.js + Express (ES modules)
- Database: MySQL
- Frontend: HTML + TailwindCSS + Chart.js
- Auth: JWT + bcrypt
- Architecture: Clean MVC + REST APIs

---

## 1) Project Structure

```text
backend/
  config/
  controllers/
  middleware/
  models/
  routes/
  services/
  seeders/
  server.js
frontend/
  components/
  pages/
database/
  schema.sql
README.md
```

---

## 2) Backend Features

- Register/Login with JWT
- Password hashing with bcrypt
- Role-based middleware (`admin`, `employee`)
- Employee feedback submission (text, language, mood, optional audio)
- Fake sentiment engine (keyword-based) with DB storage
- Admin dashboard aggregate endpoint for charts + recent feedback

---

## 3) API Endpoints (REST)

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`

### Employee
- `POST /api/feedback` (JWT employee only, multipart form-data)
- `GET /api/feedback/my` (JWT employee only)

### Admin
- `GET /api/admin/dashboard` (JWT admin only)
- `GET /api/admin/trend?days=14` (JWT admin only)
- `GET /api/admin/feedback` (JWT admin only, supports filters)
- `GET /api/admin/employees` (JWT admin only)

### Added Employee Utility
- `GET /api/feedback/my/summary` (JWT employee only)

---

## 4) Database Schema

Run the SQL file:

- `database/schema.sql`

Tables:

- `users`: `id`, `name`, `email`, `password`, `role`, `created_at`
- `feedback`: `id`, `user_id`, `message`, `language`, `audio_path`, `sentiment_score`, `emotion_label`, `mood`, `created_at`

---

## 5) Setup & Run (Step by Step)

## Prerequisites
- Node.js 18+
- MySQL 8+

## Step A: Create DB
1. Open MySQL client.
2. Run:
   - `database/schema.sql`

## Step B: Configure Backend
1. Go to backend folder:
   - `cd backend`
2. Install dependencies:
   - `npm install`
3. Create `.env` from example:
   - copy `backend/.env.example` to `backend/.env`
4. Update DB credentials and JWT secret in `.env`.

## Step C: Start Backend
- Development:
  - `npm run dev`
- Production:
  - `npm start`

API base URL:
- `http://localhost:3001/api`

## Step D: Seed Sample Data (Optional but recommended)
From `backend/`:
- `npm run seed`

Seeded users:
- Admin: `admin@sentisphere.com` / `Admin@123`
- Employee: `employee@sentisphere.com` / `Employee@123`
- Additional employees: `*@sentisphere.com` using password `Employee@123`

## Step E: Open Frontend
Use any static server from project root, for example:

- `npx serve frontend`

Then open:
- `http://localhost:3000/pages/login.html` (or the port shown by your static server)

---

## 6) Fake AI Sentiment Logic (Current Prototype)

Implemented in:
- `backend/services/sentimentService.js`

Rules:
- Contains `happy` or `good` -> Positive
- Contains `bad` or `stress` -> Negative
- Else -> Neutral

The result is saved as:
- `sentiment_score`
- `emotion_label`

---

## 7) Future AI Integration Plan (Python FastAPI Microservice)

Current architecture is already prepared to plug in AI.

### Proposed AI Service
- Build a Python FastAPI service:
  - `POST /analyze`
  - Input: `{ message, language, mood }`
  - Output: `{ sentiment_score, emotion_label, confidence }`

### Integration Steps
1. Keep the same interface currently used by `generateSentimentFromText`.
2. Replace local function call inside `feedbackController` with HTTP request to FastAPI.
3. Add fallback:
   - If AI service fails, use the current keyword engine.
4. Add retries + timeout + logging for production resilience.
5. Optional:
   - Add queue (RabbitMQ/Kafka) for heavy audio transcription and sentiment workloads.

### Why this design helps viva
- Demonstrates modular service boundaries.
- Shows progressive enhancement from prototype to production AI pipeline.
- Clean separation: web app logic vs model inference logic.

---

## 8) Screenshot Placeholders (for report/viva)

Add screenshots in your report using these labels:

1. `Login Page` – `frontend/pages/login.html`
2. `Employee Feedback Form` – `frontend/pages/employee-dashboard.html`
3. `Admin HR Dashboard` – `frontend/pages/admin-dashboard.html`
4. `Admin Feedback Explorer` – `frontend/pages/admin-feedback.html`
5. `Admin Employee Insights` – `frontend/pages/admin-employees.html`
6. `Database Tables (MySQL Workbench)` – `users` + `feedback`
7. `API Testing (Postman)` – auth + feedback + admin endpoints

---

## 9) Notes for Production Hardening

- Add input validation library (e.g., Zod/Joi)
- Add refresh token flow + secure cookies
- Add HTTPS and reverse proxy (Nginx)
- Store uploads in S3/object storage
- Add audit logs and monitoring

