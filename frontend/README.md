# LightMap Frontend

## Setup

1. Open a terminal in the repository root.
2. Install packages:
   ```bash
   cd frontend
   npm install
   ```
3. Copy environment variables:
   ```bash
   copy .env.example .env
   ```
4. Start the development server:
   ```bash
   npm run dev -- --host 0.0.0.0
   ```

The app will run at http://localhost:5173 by default.

## Notes

- The frontend expects the FastAPI backend on http://localhost:8000.
- If the backend is not running, the UI will show an understandable error state.
- The current Phase 1 implementation includes a demo enhancement fallback so the dashboard remains usable when the optional modules are not yet available.
