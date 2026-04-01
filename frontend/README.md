# SentiSphere Frontend (React)

Modern React frontend rebuilt with:

- Vite + React + TypeScript
- Tailwind CSS utilities
- Recharts for dashboard visuals
- React Router role-based routes

## Run locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create env file:

   ```bash
   cp .env.example .env
   ```

3. Start development server:

   ```bash
   npm run dev
   ```

4. Open:

   `http://localhost:3000`

## Environment

- `VITE_API_BASE_URL`: API base path or URL.
  - Default in `.env.example` is `/api` and Vite proxies to `http://localhost:3001`.

## Build and lint

```bash
npm run lint
npm run build
```
