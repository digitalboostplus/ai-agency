import { NextResponse } from 'next/server';
import {
  DEFAULT_GHL_BASE_URL,
  buildGhlHeaders,
  isRecord,
  NormalizedCustomValue,
  normalizeCustomValues,
  sanitiseBaseUrl,
} from '@/lib/ghl';
import { getPrivateAccessToken, invalidatePrivateAccessToken } from '@/server/ghl/privateToken';

interface CustomValuesRequestBody {
  baseUrl?: unknown;
}

const LEADCONNECTOR_BASE_URL = 'https://services.leadconnectorhq.com/v1';

// Endpoint permutations documented across the REST and LeadConnector hosts.
// https://marketplace.gohighlevel.com/docs/ghl/locations/get-custom-values
const PATH_PATTERNS: readonly ((locationId: string) => string)[] = [
  (locationId) => `/locations/${encodeURIComponent(locationId)}/customValues`,
  (locationId) => `/customValues/location/${encodeURIComponent(locationId)}`,
  (locationId) => `/custom-values/location/${encodeURIComponent(locationId)}`,
  (locationId) => `/locations/${encodeURIComponent(locationId)}/custom-values`,
  (locationId) => `/customValues/${encodeURIComponent(locationId)}`,
];

interface FetchAttemptResult {
  ok: boolean;
  status: number;
  url: string;
  baseUrl: string;
  path: string;
  payload: unknown;
  message: string;
}

function extractMeta(payload: unknown): Record<string, unknown> | null {
  if (!isRecord(payload)) {
    return null;
  }

  if (isRecord(payload.meta)) {
    return payload.meta;
  }

  if (isRecord(payload.pagination)) {
    return payload.pagination;
  }

  if (typeof payload.total === 'number') {
    return { total: payload.total };
  }

  return null;
}

function buildAttempt(
  baseUrl: string,
  path: string,
  payload: unknown,
  status: number,
  message: string,
  ok: boolean,
): FetchAttemptResult {
  const normalisedBase = baseUrl.replace(/\/+$/, '');
  const normalisedPath = path.startsWith('/') ? path : `/${path}`;
  return {
    ok,
    status,
    url: `${normalisedBase}${normalisedPath}`,
    baseUrl: normalisedBase,
    path: normalisedPath,
    payload,
    message,
  };
}

async function fetchCustomValues(
  baseUrl: string,
  path: string,
  accessToken: string,
): Promise<FetchAttemptResult> {
  const normalisedBase = baseUrl.replace(/\/+$/, '');
  const normalisedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${normalisedBase}${normalisedPath}`;
  let payload: unknown = null;

  try {
    const ghlResponse = await fetch(url, {
      method: 'GET',
      headers: buildGhlHeaders(accessToken),
      cache: 'no-store',
    });

    const responseText = await ghlResponse.text();
    if (responseText) {
      try {
        payload = JSON.parse(responseText);
      } catch {
        payload = responseText;
      }
    }

    if (!ghlResponse.ok) {
      const message =
        (isRecord(payload) && typeof payload?.message === 'string' && payload.message) ||
        `Go High Level returned status ${ghlResponse.status} for ${url}.`;

      return buildAttempt(baseUrl, normalisedPath, payload, ghlResponse.status, message, false);
    }

    return buildAttempt(baseUrl, normalisedPath, payload, ghlResponse.status, 'OK', true);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown network error';
    return buildAttempt(baseUrl, normalisedPath, null, 0, message, false);
  }
}

async function requestCustomValuesForBase(
  locationId: string,
  baseUrl: string,
  accessToken: string,
): Promise<{ success: FetchAttemptResult | null; attempts: FetchAttemptResult[] }> {
  const attempts: FetchAttemptResult[] = [];

  for (const pattern of PATH_PATTERNS) {
    const path = pattern(locationId);
    const attempt = await fetchCustomValues(baseUrl, path, accessToken);
    attempts.push(attempt);

    if (attempt.ok) {
      return { success: attempt, attempts };
    }

    if (attempt.status === 0) {
      return { success: null, attempts };
    }

    if (attempt.status !== 404) {
      return { success: null, attempts };
    }
  }

  return { success: null, attempts };
}

export async function POST(req: Request, context: { params: Promise<{ locationId: string }> }) {
  const { locationId } = await context.params;

  if (!locationId) {
    return NextResponse.json(
      {
        error: 'A sub-account identifier is required.',
      },
      { status: 400 },
    );
  }

  let body: CustomValuesRequestBody = {};

  try {
    body = (await req.json()) as CustomValuesRequestBody;
  } catch {
    body = {};
  }

  const primaryBase = sanitiseBaseUrl(body.baseUrl);
  const candidateBases: string[] = [];
  const seenBases = new Set<string>();

  const addCandidate = (base: string) => {
    if (!seenBases.has(base)) {
      candidateBases.push(base);
      seenBases.add(base);
    }
  };

  addCandidate(primaryBase);

  if (primaryBase === DEFAULT_GHL_BASE_URL) {
    addCandidate(LEADCONNECTOR_BASE_URL);
  } else if (primaryBase === LEADCONNECTOR_BASE_URL) {
    addCandidate(DEFAULT_GHL_BASE_URL);
  }

  const allAttempts: FetchAttemptResult[] = [];
  let accessToken: string;

  try {
    accessToken = await getPrivateAccessToken();
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : 'Unable to obtain HighLevel access token.';

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 },
    );
  }

  let unauthorizedRetryUsed = false;

  for (const base of candidateBases) {
    let result = await requestCustomValuesForBase(locationId, base, accessToken);
    allAttempts.push(...result.attempts);

    const encounteredUnauthorized = result.attempts.some((attempt) =>
      attempt.status === 401 || attempt.status === 403,
    );

    if (!result.success && encounteredUnauthorized && !unauthorizedRetryUsed) {
      unauthorizedRetryUsed = true;
      invalidatePrivateAccessToken();

      try {
        accessToken = await getPrivateAccessToken();
      } catch (error) {
        const message = error instanceof Error
          ? error.message
          : 'Unable to refresh HighLevel access token.';

        return NextResponse.json(
          {
            error: message,
            attemptedUrls: allAttempts.map((attempt) => attempt.url),
            attemptedBaseUrls: allAttempts.map((attempt) => attempt.baseUrl),
            attemptedPaths: allAttempts.map((attempt) => attempt.path),
          },
          { status: 500 },
        );
      }

      result = await requestCustomValuesForBase(locationId, base, accessToken);
      allAttempts.push(...result.attempts);
    }

    if (result.success?.ok) {
      const customValues: NormalizedCustomValue[] = normalizeCustomValues(result.success.payload);

      return NextResponse.json({
        customValues,
        count: customValues.length,
        meta: extractMeta(result.success.payload),
        source: {
          url: result.success.url,
        },
        resolvedBaseUrl: result.success.baseUrl,
        attemptedUrls: allAttempts.map((attempt) => attempt.url),
        attemptedBaseUrls: allAttempts.map((attempt) => attempt.baseUrl),
        attemptedPaths: allAttempts.map((attempt) => attempt.path),
      });
    }

    const hasNetworkFailure = result.attempts.some((attempt) => attempt.status === 0);
    if (hasNetworkFailure) {
      const networkAttempt = result.attempts.find((attempt) => attempt.status === 0) ?? result.attempts.at(-1);
      return NextResponse.json(
        {
          error: networkAttempt?.message ?? 'Unable to reach the Go High Level API. Check your base URL and network connectivity.',
          attemptedUrls: allAttempts.map((attempt) => attempt.url),
          attemptedBaseUrls: allAttempts.map((attempt) => attempt.baseUrl),
          attemptedPaths: allAttempts.map((attempt) => attempt.path),
        },
        { status: 502 },
      );
    }

    const non404Attempt = result.attempts.find((attempt) => attempt.status !== 404);
    if (non404Attempt) {
      return NextResponse.json(
        {
          error: non404Attempt.message,
          statusCode: non404Attempt.status,
          attemptedUrls: allAttempts.map((attempt) => attempt.url),
          attemptedBaseUrls: allAttempts.map((attempt) => attempt.baseUrl),
          attemptedPaths: allAttempts.map((attempt) => attempt.path),
        },
        { status: non404Attempt.status },
      );
    }
  }

  const uniqueAttempts = allAttempts.filter((attempt, index, array) =>
    array.findIndex((candidate) => candidate.url === attempt.url) === index,
  );

  const warningMessage = uniqueAttempts.length > 0
    ? 'No custom values were found for this sub-account using the known API endpoints.'
    : 'No custom values were found for this sub-account.';

  const lastAttempt = uniqueAttempts.at(-1);

  return NextResponse.json({
    customValues: [],
    count: 0,
    warning: warningMessage,
    meta: null,
    source: lastAttempt
      ? {
          url: lastAttempt.url,
        }
      : null,
    resolvedBaseUrl: null,
    attemptedUrls: uniqueAttempts.map((attempt) => attempt.url),
    attemptedBaseUrls: uniqueAttempts.map((attempt) => attempt.baseUrl),
    attemptedPaths: uniqueAttempts.map((attempt) => attempt.path),
  });
}
