export const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export async function getJson(path) {
  const response = await fetch(`${API_BASE}${path}`, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`API trả về HTTP ${response.status}`);
  return response.json();
}
