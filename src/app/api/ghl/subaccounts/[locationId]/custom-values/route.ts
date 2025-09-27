import { NextResponse } from 'next/server';
import {
  buildGhlHeaders,
  isRecord,
  normalizeCustomValueList,
  sanitiseBaseUrl,
} from '@/lib/ghl';

interface CustomValuesRequestBody {
  apiKey?: unknown;
  baseUrl?: unknown;
}

interface RouteParams {
  params: {
    locationId: string;
  };
}

interface FetchResult {
  response: Response;
  payload: unknown;
}

function extractErrorMessage(payload: unknown): string | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }

  if (typeof payload.message === 'string' && payload.message.trim().length > 0) {
    return payload.message.trim();
  }

  if (typeof payload.error === 'string' && payload.error.trim().length > 0) {
    return payload.error.trim();
  }

  return undefined;
}

async function fetchCustomValues(url: string, apiKey: string): Promise<FetchResult> {
  const response = await fetch(url, {
    method: 'GET',
    headers: buildGhlHeaders(apiKey),
    cache: 'no-store',
  });

  const text = await response.text();
  let payload: unknown = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  return { response, payload };
}

export async function POST(req: Request, { params }: RouteParams) {
  const locationId = params?.locationId;

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

  const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
  if (!apiKey) {
    return NextResponse.json(
      {
        error: 'An API key is required to query Go High Level.',
      },
      { status: 400 },
    );
  }

  const baseUrl = sanitiseBaseUrl(body.baseUrl);
  const primaryUrl = `${baseUrl}/locations/${encodeURIComponent(locationId)}/customValues`;
  const fallbackUrl = `${baseUrl}/custom-values?locationId=${encodeURIComponent(locationId)}`;

  let usedUrl = primaryUrl;
  let usedFallback = false;
  let payload: unknown = null;

  let primaryResult: FetchResult;
  try {
    primaryResult = await fetchCustomValues(primaryUrl, apiKey);
  } catch {
    return NextResponse.json(
      {
        error: 'Unable to reach the Go High Level API. Check your base URL and network connectivity.',
      },
      { status: 502 },
    );
  }

  if (primaryResult.response.ok) {
    payload = primaryResult.payload;
  } else {
    let fallbackResult: FetchResult;

    try {
      fallbackResult = await fetchCustomValues(fallbackUrl, apiKey);
      usedFallback = true;
      usedUrl = fallbackUrl;
    } catch {
      return NextResponse.json(
        {
          error: 'Unable to reach the Go High Level API. Check your base URL and network connectivity.',
        },
        { status: 502 },
      );
    }

    if (!fallbackResult.response.ok) {
      const message =
        extractErrorMessage(fallbackResult.payload) ??
        extractErrorMessage(primaryResult.payload) ??
        'Failed to retrieve custom values from Go High Level.';

      return NextResponse.json(
        {
          error: message,
          statusCode: fallbackResult.response.status,
        },
        { status: fallbackResult.response.status },
      );
    }

    payload = fallbackResult.payload;
  }

  const values = normalizeCustomValueList(payload ?? []);

  return NextResponse.json({
    values,
    source: {
      url: usedUrl,
      ...(usedFallback ? { fallbackUrl, usedFallback: true } : {}),
    },
  });
}
