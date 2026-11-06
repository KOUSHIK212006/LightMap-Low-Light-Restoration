# LightMap Backend

## Setup

1. Open a terminal in the repository root.
2. Create a virtual environment:
   ```bash
   py -3.11 -m venv .venv
   .venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
4. Copy environment variables:
   ```bash
   copy backend\.env.example backend\.env
   ```
5. Start the API:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

The API will be available at http://localhost:8000.

## Endpoints

- `GET /` — service metadata
- `GET /health` — health status
- `POST /api/v1/analyze` — validate and analyze a low-light image
- `POST /api/v1/enhance` — run the restoration pipeline
- `POST /api/v1/compare` — produce a comparison summary

## Notes

- Only PNG, JPG, and JPEG uploads are accepted.
- Uploads are limited to 10 MB and 4096x4096 pixels by default.
- The app intentionally exposes data URLs for output images instead of leaking filesystem paths.
