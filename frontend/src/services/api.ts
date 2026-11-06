import type { EnhancementResponse, ImageProfile } from '../types/image';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function parseResponse(response: Response): Promise<any> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.detail || data?.message || 'Unexpected API error.';
    throw new Error(message);
  }
  return data;
}

export async function enhanceImage(file: File, profile: ImageProfile): Promise<EnhancementResponse> {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('profile', profile);

  const response = await fetch(`${API_BASE_URL}/api/v1/enhance`, {
    method: 'POST',
    body: formData,
  });

  return parseResponse(response) as Promise<EnhancementResponse>;
}

export async function analyzeImage(file: File, profile: ImageProfile): Promise<any> {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('profile', profile);

  const response = await fetch(`${API_BASE_URL}/api/v1/analyze`, {
    method: 'POST',
    body: formData,
  });

  return parseResponse(response);
}

export async function healthCheck(): Promise<{ status: string; version: string; message: string }> {
  const response = await fetch(`${API_BASE_URL}/health`);
  return parseResponse(response);
}
