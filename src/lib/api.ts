export class ApiRequestError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchApiJson<T>(
  url: string,
  options: RequestInit & { retries?: number; retryDelayMs?: number } = {}
): Promise<T> {
  const { retries = 2, retryDelayMs = 800, ...fetchInit } = options;
  let lastError: Error = new ApiRequestError('Unable to reach the Job Radar server.');

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, fetchInit);
      const rawText = await res.text();
      const trimmed = rawText.trim();

      let parsed: unknown = null;
      let isJson = false;
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          parsed = JSON.parse(trimmed);
          isJson = true;
        } catch {
          isJson = false;
        }
      }

      // Transient proxy/cold-start responses ("The page could not...", 502/503/504 HTML)
      if (!isJson) {
        const isTransientStatus = res.status === 0 || res.status >= 502 || res.status === 404;
        if (attempt < retries && isTransientStatus) {
          await wait(retryDelayMs * (attempt + 1));
          continue;
        }
        throw new ApiRequestError(
          res.ok
            ? 'Received an unexpected non-JSON response from the server. Please refresh in a moment.'
            : `Job Radar server is temporarily unavailable (HTTP ${res.status}). Please try again in a moment.`,
          res.status
        );
      }

      if (!res.ok) {
        const errMsg =
          parsed &&
          typeof parsed === 'object' &&
          'error' in parsed &&
          typeof (parsed as { error?: unknown }).error === 'string'
            ? (parsed as { error: string }).error
            : `Request failed (HTTP ${res.status}).`;

        if (attempt < retries && res.status >= 502) {
          await wait(retryDelayMs * (attempt + 1));
          continue;
        }
        throw new ApiRequestError(errMsg, res.status);
      }

      return parsed as T;
    } catch (err) {
      if (err instanceof ApiRequestError) {
        lastError = err;
        // Do not retry client 4xx errors other than transient proxy 404
        if (err.status >= 400 && err.status < 500 && err.status !== 404) {
          throw err;
        }
      } else {
        lastError = new ApiRequestError(
          'Job Radar server is waking up or unreachable. Retrying connection...'
        );
      }

      if (attempt < retries) {
        await wait(retryDelayMs * (attempt + 1));
        continue;
      }
    }
  }

  throw lastError;
}
