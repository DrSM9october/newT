export function getApiBaseUrl(): string {
  const envUrl = import.meta.env?.VITE_API_BASE_URL;

  if (
    envUrl &&
    typeof envUrl === 'string' &&
    envUrl.trim()
  ) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  try {
    const stored = localStorage.getItem('linguaai_api_url');

    if (stored && stored.trim()) {
      return stored.trim().replace(/\/+$/, '');
    }
  } catch {
    // localStorage may be unavailable.
  }

  if (import.meta.env?.DEV) {
    return 'http://localhost:3000';
  }

  return '';
}

export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = 15000
): Promise<Response> {
  const controller = new AbortController();

  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function checkHealth(): Promise<{
  status: 'online' | 'offline';
  geminiConfigured: boolean;
  error?: string;
}> {
  const baseUrl = getApiBaseUrl();

  if (!baseUrl) {
    return {
      status: 'offline',
      geminiConfigured: false,
      error: 'No API URL configured',
    };
  }

  try {
    const response = await fetchWithTimeout(
      `${baseUrl}/api/health`,
      {
        method: 'GET',
      },
      5000
    );

    if (!response.ok) {
      return {
        status: 'offline',
        geminiConfigured: false,
        error: `HTTP ${response.status}`,
      };
    }

    const data = await response.json();

    return {
      status: 'online',
      geminiConfigured: data.gemini === true,
    };
  } catch (error: unknown) {
    return {
      status: 'offline',
      geminiConfigured: false,
      error:
        error instanceof Error
          ? error.message
          : 'Network error',
    };
  }
}
