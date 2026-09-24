const SERVER_UNAVAILABLE = 'El servidor de acceso no está disponible. Intenta de nuevo en unos segundos.';

export function walletErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'string' && error.trim()) return error;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message || fallback;
  }
  return fallback;
}

export async function postAuth<T>(action: 'challenge' | 'verify', body: object): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/auth/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new Error(SERVER_UNAVAILABLE);
  }

  // Vite can return an empty 500 when the API is stopped.
  if (response.status >= 500) throw new Error(SERVER_UNAVAILABLE);
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(walletErrorMessage(data, 'No se pudo iniciar sesión. Vuelve a intentarlo.'));
  }
  if (!data || typeof data !== 'object') {
    throw new Error('El servidor devolvió una respuesta incompleta. Vuelve a intentarlo.');
  }
  return data as T;
}
