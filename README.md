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
model/
  app.py
  requirements.txt
README.md
```

---

## 2) Backend Features

- Register/Login with JWT
- Password hashing with bcrypt
- Role-based middleware (`admin`, `employee`)
- Employee feedback submission (text, language, optional audio); stress from Python model API
- Model-only sentiment/stress scoring (no keyword fallback)
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

> **On Windows?** Follow **[§6 Setup on Windows](#6-setup-on-windows)** for PATH, MySQL Workbench, venv activation, and PowerShell notes. The steps below match the same flow on macOS / Linux.

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

## 6) Setup on Windows

Use **PowerShell**, **Command Prompt**, or **Windows Terminal** from the project folder. Commands below use PowerShell where it matters (e.g. `Copy-Item`, `Activate.ps1`).

### Prerequisites (install first)

| Tool | Notes |
|------|--------|
| **Node.js 18+** | [nodejs.org](https://nodejs.org/) LTS installer — tick “Add to PATH”. Check: `node -v` and `npm -v`. |
| **MySQL 8+** | [MySQL Installer](https://dev.mysql.com/downloads/installer/) (Community Server) or compatible MariaDB. Note the **root password** you set. |
| **Python 3.10+** | [python.org](https://www.python.org/downloads/windows/) — enable **“Add python.exe to PATH”**. Check: `python --version` or `py -3 --version`. |
| **Git** (optional) | [git-scm.com](https://git-scm.com/download/win) |

### Step A — MySQL database

1. Ensure the MySQL service is running: **Win + R** → `services.msc` → start **MySQL** (name may be `MySQL80` or similar), or in an **Administrator** Command Prompt: `net start MySQL80` (adjust service name if different).
2. Create the schema using **MySQL Workbench** (installed with MySQL): connect as `root` → **File → Open SQL Script** → choose `database\schema.sql` from this repo → execute (lightning icon).  
   **Or** from a terminal (if `mysql.exe` is on your PATH, often under `C:\Program Files\MySQL\MySQL Server 8.0\bin`):

   ```bat
   cd path\to\EWA
   mysql -u root -p < database\schema.sql
   ```

### Step B — Backend

```powershell
cd path\to\EWA\backend
npm install
Copy-Item .env.example .env
notepad .env
```

In `.env`, set at least: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME=sentisphere_ai`, `JWT_SECRET`, and **`STRESS_API_URL=http://127.0.0.1:8000`** (required for feedback).

CMD alternative for copying: `copy .env.example .env`

### Step C — Python stress model API

Open a **new** terminal (keep it open while developing):

```powershell
cd path\to\EWA\model
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app:app --host 127.0.0.1 --port 8000
```

- **Command Prompt** (no PowerShell): run `.\.venv\Scripts\activate.bat` instead of `Activate.ps1`.
- If PowerShell says scripts are disabled:  
  `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`  
  then try activating the venv again.
- If `python` is not found, try `py -3 -m venv .venv` and `py -3 -m pip install -r requirements.txt`.

First run may download the Hugging Face model; wait until the server is listening on port **8000**.

### Step D — Start the Node backend

Another new terminal:

```powershell
cd path\to\EWA\backend
npm start
```

For auto-reload during development: `npm run dev` (requires `nodemon` from devDependencies).

Default API base: `http://localhost:3001/api` (set `PORT` in `.env` if you change it).

### Step E — Frontend

From the **repository root** (`EWA`):

```powershell
cd path\to\EWA
npx serve frontend
```

Open the URL shown in the terminal (often `http://localhost:3000`) and go to **`/pages/login.html`**.

### Step F — Seed data (optional)

The stress API **must be running** on port 8000. Then:

```powershell
cd path\to\EWA\backend
npm run seed
```

### Common issues on Windows

- **`mysql` is not recognized** — Add MySQL’s `bin` folder to your user **PATH**, or use the full path to `mysql.exe`.
- **Port already in use (3001 / 8000)** — Stop the other program or change `PORT` / run uvicorn on another port and update `STRESS_API_URL` accordingly.
- **503 on feedback submit** — Backend cannot reach the model: confirm uvicorn is running and `STRESS_API_URL` in `backend\.env` matches (e.g. `http://127.0.0.1:8000`).
- **Windows Firewall** — Allow **Node.js** and **Python** if a prompt appears when first binding to ports.

---

## 7) Sentiment / stress analysis (model-only)

Implemented in `backend/services/sentimentService.js`. Employee feedback **does not** collect mood; scores come **only** from the Python FastAPI service.

**Required for feedback submission:** set `STRESS_API_URL` in `backend/.env` and run the model API.

1. From `model/`, install deps and run (see `model/requirements.txt`), e.g.  
   `uvicorn app:app --host 127.0.0.1 --port 8000`
2. In `backend/.env`:
   - `STRESS_API_URL=http://127.0.0.1:8000`
   - Optional: `STRESS_API_TIMEOUT_MS` (default `15000`)

The backend calls `POST /analyze` with `{ "sentence": "<feedback text>" }`. The service returns `stress_score`, `stress_level`, and `label`; those are mapped to `sentiment_score` (0–1), `emotion_label`, and a stored **stress band** in the existing `mood` column (Low → `Happy`, Medium → `Neutral`, High → `Stressed`) for admin charts and filters.

If the URL is missing or the model call fails, the API responds with **503** and does not use keyword rules.

**Seeding:** `npm run seed` calls the same model endpoint for each row; start the model service first or seeding will fail.

---

## 8) Further production ideas

- Retries and structured logging around the model HTTP call
- Queue (e.g. RabbitMQ/Kafka) for heavy workloads or audio pipelines
- Extend FastAPI to accept `language` / `mood` in the request body for richer models

---

## 9) Screenshot Placeholders (for report/viva)

Add screenshots in your report using these labels:

1. `Login Page` – `frontend/pages/login.html`
2. `Employee Feedback Form` – `frontend/pages/employee-dashboard.html`
3. `Admin HR Dashboard` – `frontend/pages/admin-dashboard.html`
4. `Admin Feedback Explorer` – `frontend/pages/admin-feedback.html`
5. `Admin Employee Insights` – `frontend/pages/admin-employees.html`
6. `Database Tables (MySQL Workbench)` – `users` + `feedback`
7. `API Testing (Postman)` – auth + feedback + admin endpoints

---

## 10) Notes for Production Hardening

- Add input validation library (e.g., Zod/Joi)
- Add refresh token flow + secure cookies
- Add HTTPS and reverse proxy (Nginx)
- Store uploads in S3/object storage
- Add audit logs and monitoring

