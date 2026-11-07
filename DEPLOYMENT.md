# LightMap Render Deployment Guide

This project is configured for a Render Web Service for the Python backend and a Render Static Site for the Vite frontend.

## Repository layout

- Backend root: `backend/`
- Frontend root: `frontend/`
- Python dependency file: `backend/requirements.txt`
- App entry point: `backend/app/main.py`
- App router: `backend/app/api/routes.py`

## Backend deployment

### Render Web Service

- Branch: `main`
- Root directory: `backend`
- Build command:
  ```bash
  pip install --upgrade pip && pip install -r requirements.txt
  ```
- Start command:
  ```bash
  uvicorn app.main:app --host 0.0.0.0 --port $PORT
  ```
- Python version: `3.11`

### Required environment variables

```env
LIGHTMAP_DEBUG=false
LIGHTMAP_CORS_ORIGINS=https://<frontend-domain>
LIGHTMAP_FRONTEND_ORIGIN=https://<frontend-domain>
LIGHTMAP_MAX_UPLOAD_SIZE_MB=10
LIGHTMAP_MAX_IMAGE_WIDTH=4096
LIGHTMAP_MAX_IMAGE_HEIGHT=4096
LIGHTMAP_DEEP_CHECKPOINT_PATH=
LIGHTMAP_RETINEXFORMER_REPO_PATH=
```

`PORT` is provided by Render automatically.

### Important notes

- Do not set wildcard CORS in production where possible.
- Keep the backend bound to `0.0.0.0` and use Render's `$PORT`.
- `/health` must return HTTP 200.
- The backend accepts uploaded JPG/PNG images; large images are rejected by size and dimension limits.
- Deep-learning output requires a Retinexformer checkpoint. If it is unavailable, classical mode continues to work and the API returns clear warnings instead of fake deep output.

## Frontend deployment

### Render Static Site

- Branch: `main`
- Root directory: `frontend`
- Build command:
  ```bash
  npm install && npm run build
  ```
- Publish directory:
  ```bash
  dist
  ```
- Environment variable:
  ```env
  VITE_API_BASE_URL=https://<backend-service-domain>
  ```

### Alternative: Vercel

- Root directory: `frontend`
- Build command: `npm install && npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_BASE_URL=https://<backend-service-domain>`

## Model checkpoint requirement

The Retinexformer checkpoint is excluded from source control and must be added externally before deep restoration is available.

Expected location in the repository:

```text
pretrained_weights/retinexformer-lol-v2-real.pth
```

or provide the path through:

```env
LIGHTMAP_DEEP_CHECKPOINT_PATH=/path/to/retinexformer-lol-v2-real.pth
```

The repo does not include the model weights, and they must not be committed to Git.

## Verification after deployment

1. Visit `https://<backend-domain>/health`
2. Visit `https://<backend-domain>/docs`
3. Visit `https://<frontend-domain>`
4. Upload a sample low-light image
5. Run classical restoration
6. Confirm deep mode is only available when the checkpoint is present
7. Confirm hybrid mode works only when both branch outputs are available
8. Download the enhanced image
