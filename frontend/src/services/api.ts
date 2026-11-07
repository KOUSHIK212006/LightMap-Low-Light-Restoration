import type { EnhancementResponse, ImageProfile, RestorationMode } from '../types/image';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.detail || data?.message || 'Unexpected API error.';
    throw new Error(message);
  }
  return data as T;
}

export async function enhanceImage(
  file: File,
  profile: ImageProfile,
  mode: RestorationMode = 'hybrid'
): Promise<EnhancementResponse> {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('profile', profile);
  formData.append('mode', mode);

  const response = await fetch(`${API_BASE_URL}/api/v1/enhance`, {
    method: 'POST',
    body: formData,
  });

  return parseResponse<EnhancementResponse>(response);
}

export async function analyzeImage(file: File, profile: ImageProfile): Promise<Record<string, unknown>> {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('profile', profile);

  const response = await fetch(`${API_BASE_URL}/api/v1/analyze`, {
    method: 'POST',
    body: formData,
  });

  return parseResponse<Record<string, unknown>>(response);
}

export async function healthCheck(): Promise<{ status: string; version: string; message: string }> {
  const response = await fetch(`${API_BASE_URL}/health`);
  return parseResponse<{ status: string; version: string; message: string }>(response);
}

export async function fetchSampleImage(): Promise<File> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/sample`);
    if (res.ok) {
      const blob = await res.blob();
      return new File([blob], 'sample_dark.jpg', { type: blob.type || 'image/jpeg' });
    }
  } catch {
    // Fallback to static public file
  }

  const staticRes = await fetch('/test_dark.jpg');
  if (!staticRes.ok) {
    throw new Error('Failed to load sample image.');
  }
  const blob = await staticRes.blob();
  return new File([blob], 'sample_dark.jpg', { type: 'image/jpeg' });
}
