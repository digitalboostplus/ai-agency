import { NextResponse } from 'next/server';
import {
  buildGhlHeaders,
  isRecord,
  NormalizedLocation,
  normalizeLocation,
  sanitiseBaseUrl,
} from '@/lib/ghl';
import { getPrivateAccessToken, invalidatePrivateAccessToken } from '@/server/ghl/privateToken';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

interface ListRequestBody {
  searchTerm?: unknown;
  limit?: unknown;
  baseUrl?: unknown;
}

function parseLimit(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return clampLimit(value);
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed)) {
      return clampLimit(parsed);
    }
  }

  return DEFAULT_LIMIT;
}

function clampLimit(value: number): number {
  if (value < 1) {
    return 1;
  }

  if (value > MAX_LIMIT) {
    return MAX_LIMIT;
  }

  return Math.floor(value);
}

function extractLocations(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter((item): item is Record<string, unknown> => isRecord(item));
  }

  if (isRecord(payload)) {
    if (Array.isArray(payload.locations)) {
      return payload.locations.filter((item): item is Record<string, unknown> => isRecord(item));
    }

    if (Array.isArray(payload.data)) {
      return payload.data.filter((item): item is Record<string, unknown> => isRecord(item));
    }
  }

  return [];
}

function extractMeta(payload: unknown): Record<string, unknown> | null {
  if (isRecord(payload)) {
    if (isRecord(payload.meta)) {
      return payload.meta;
    }

    if (isRecord(payload.pagination)) {
      return payload.pagination;
    }
  }

  return null;
}

function filterLocationsByTerm(locations: NormalizedLocation[], term: string): NormalizedLocation[] {
  const normalizedTerm = term.trim().toLowerCase();
  if (!normalizedTerm) {
    return locations;
  }

  return locations.filter((location) => {
    const values: string[] = [];

    values.push(location.id);

    if (location.name) {
      values.push(location.name);
    }

    if (location.email) {
      values.push(location.email);
    }

    if (location.phone) {
      values.push(location.phone);
    }

    if (location.website) {
      values.push(location.website);
    }

    if (location.status) {
      values.push(location.status);
    }

    if (location.timezone) {
      values.push(location.timezone);
    }

    if (location.address) {
      const { line1, line2, city, state, postalCode, country } = location.address;
      for (const part of [line1, line2, city, state, postalCode, country]) {
        if (part) {
          values.push(part);
        }
      }
    }

    if (location.tags) {
      values.push(...location.tags);
    }

    const haystack = values
      .map((value) => value.toLowerCase())
      .join(' ');

    return haystack.includes(normalizedTerm);
  });
}

export async function POST(req: Request) {
  let body: ListRequestBody;

  try {
    body = (await req.json()) as ListRequestBody;
  } catch {
    return NextResponse.json(
      {
        error: 'Invalid request body. Ensure the payload is valid JSON.',
      },
      { status: 400 },
    );
  }

  const baseUrl = sanitiseBaseUrl(body.baseUrl);
  const limit = parseLimit(body.limit);
  const searchTerm = typeof body.searchTerm === 'string' ? body.searchTerm.trim() : '';

  const requestUrl = new URL(`${baseUrl}/locations/`);
  requestUrl.searchParams.set('limit', String(limit));
  if (searchTerm) {
    requestUrl.searchParams.set('search', searchTerm);
  }

  let responseText = '';
  let payload: unknown = null;

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

  const executeRequest = async (token: string) =>
    fetch(requestUrl.toString(), {
      method: 'GET',
      headers: buildGhlHeaders(token),
      cache: 'no-store',
    });

  try {
    let ghlResponse = await executeRequest(accessToken);

    if (ghlResponse.status === 401 || ghlResponse.status === 403) {
      invalidatePrivateAccessToken();
      const refreshedToken = await getPrivateAccessToken();
      ghlResponse = await executeRequest(refreshedToken);
    }

    responseText = await ghlResponse.text();

    if (responseText) {
      try {
        payload = JSON.parse(responseText);
      } catch {
        payload = null;
      }
    }

    if (!ghlResponse.ok) {
      const message =
        (isRecord(payload) && typeof payload.message === 'string' && payload.message) ||
        'Failed to retrieve sub-accounts from Go High Level.';

      return NextResponse.json(
        {
          error: message,
          statusCode: ghlResponse.status,
        },
        { status: ghlResponse.status },
      );
    }
  } catch {
    return NextResponse.json(
      {
        error: 'Unable to reach the Go High Level API. Check your base URL and network connectivity.',
      },
      { status: 502 },
    );
  }

  const rawLocations = extractLocations(payload);
  const normalizedLocations = rawLocations
    .map((item) => normalizeLocation(item))
    .filter((location): location is NormalizedLocation => Boolean(location));

  const filteredLocations = searchTerm
    ? filterLocationsByTerm(normalizedLocations, searchTerm)
    : normalizedLocations;

  return NextResponse.json({
    locations: filteredLocations,
    meta: extractMeta(payload),
    query: {
      limit,
      searchTerm,
      baseUrl,
    },
    source: {
      url: requestUrl.toString(),
    },
  });
}
