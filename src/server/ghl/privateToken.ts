import 'server-only';

const TOKEN_ENDPOINT = process.env.GHL_PRIVATE_TOKEN_ENDPOINT?.trim() ||
  'https://services.leadconnectorhq.com/oauth/token';
const DEFAULT_USER_TYPE = process.env.GHL_PRIVATE_USER_TYPE?.trim() || 'Company';
const EXPIRY_BUFFER_SECONDS = Number.parseInt(
  process.env.GHL_PRIVATE_TOKEN_BUFFER_SECONDS || '60',
  10,
);
const TOKEN_BUFFER = Number.isFinite(EXPIRY_BUFFER_SECONDS) && EXPIRY_BUFFER_SECONDS > 0
  ? EXPIRY_BUFFER_SECONDS
  : 60;
const MINIMUM_EXPIRY_FALLBACK_SECONDS = 30;

interface TokenCache {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
}

interface TokenResponse {
  access_token?: unknown;
  expires_in?: unknown;
  refresh_token?: unknown;
  message?: unknown;
  error?: unknown;
}

let cachedToken: TokenCache | null = null;
let inFlight: Promise<TokenCache> | null = null;
let lastKnownRefreshToken = process.env.GHL_PRIVATE_REFRESH_TOKEN?.trim() || null;

function assertClientCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.GHL_PRIVATE_CLIENT_ID?.trim();
  const clientSecret = process.env.GHL_PRIVATE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error(
      'Missing GHL private integration credentials. Define GHL_PRIVATE_CLIENT_ID and GHL_PRIVATE_CLIENT_SECRET.',
    );
  }

  return { clientId, clientSecret };
}

function parseExpiresIn(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function normaliseError(payload: TokenResponse, status: number): string {
  if (typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message.trim();
  }

  if (typeof payload.error === 'string' && payload.error.trim()) {
    return payload.error.trim();
  }

  return `HighLevel token request failed with status ${status}.`;
}

async function performTokenRequest(params: Record<string, string>): Promise<TokenCache> {
  const { clientId, clientSecret } = assertClientCredentials();
  const searchParams = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    user_type: DEFAULT_USER_TYPE,
    ...params,
  });

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: searchParams.toString(),
    cache: 'no-store',
  });

  const text = await response.text();
  let payload: TokenResponse = {};

  if (text) {
    try {
      payload = JSON.parse(text) as TokenResponse;
    } catch {
      payload = {};
    }
  }

  if (!response.ok) {
    throw new Error(normaliseError(payload, response.status));
  }

  const accessToken = typeof payload.access_token === 'string' ? payload.access_token.trim() : '';
  if (!accessToken) {
    throw new Error('HighLevel token response did not include an access_token.');
  }

  const expiresIn = parseExpiresIn(payload.expires_in);
  const refreshToken =
    typeof payload.refresh_token === 'string' && payload.refresh_token.trim().length > 0
      ? payload.refresh_token.trim()
      : params.refresh_token ?? null;

  const effectiveDuration = Math.max(expiresIn - TOKEN_BUFFER, MINIMUM_EXPIRY_FALLBACK_SECONDS);
  const expiresAt = Date.now() + effectiveDuration * 1000;

  const token: TokenCache = {
    accessToken,
    refreshToken,
    expiresAt,
  };

  cachedToken = token;
  if (refreshToken) {
    lastKnownRefreshToken = refreshToken;
  }

  return token;
}

async function obtainFreshToken(): Promise<TokenCache> {
  const refreshToken = lastKnownRefreshToken;
  const authorizationCode = process.env.GHL_PRIVATE_AUTH_CODE?.trim() || null;
  const attemptErrors: Error[] = [];

  if (refreshToken) {
    try {
      return await performTokenRequest({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      });
    } catch (error) {
      lastKnownRefreshToken = null;
      attemptErrors.push(error instanceof Error ? error : new Error(String(error)));
    }
  }

  if (authorizationCode) {
    try {
      const token = await performTokenRequest({
        grant_type: 'authorization_code',
        code: authorizationCode,
      });

      return token;
    } catch (error) {
      attemptErrors.push(error instanceof Error ? error : new Error(String(error)));
    }
  }

  const message = attemptErrors.length > 0
    ? attemptErrors.map((err) => err.message).join(' | ')
    : 'No refresh token or authorization code is configured for the HighLevel private integration.';

  throw new Error(message);
}

export async function getPrivateAccessToken(): Promise<string> {
  const now = Date.now();

  if (cachedToken && cachedToken.expiresAt > now) {
    return cachedToken.accessToken;
  }

  if (!inFlight) {
    inFlight = obtainFreshToken().finally(() => {
      inFlight = null;
    });
  }

  try {
    const token = await inFlight;
    return token.accessToken;
  } finally {
    if (!cachedToken) {
      // Ensure we do not keep a rejected promise reference.
      inFlight = null;
    }
  }
}

export function getLastKnownRefreshToken(): string | null {
  return lastKnownRefreshToken;
}

export function invalidatePrivateAccessToken(): void {
  cachedToken = null;
}
