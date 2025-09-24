import { NextResponse } from 'next/server';
import {
  buildGhlHeaders,
  isRecord,
  NormalizedLocation,
  normalizeLocation,
  sanitiseBaseUrl,
} from '@/lib/ghl';

interface DetailRequestBody {
  apiKey?: unknown;
  baseUrl?: unknown;
}

interface RouteParams {
  params: {
    locationId: string;
  };
}

function extractLocation(payload: unknown): Record<string, unknown> | null {
  if (isRecord(payload)) {
    if (isRecord(payload.location)) {
      return payload.location;
    }

    if (isRecord(payload.data)) {
      return payload.data;
    }

    return payload;
  }

  return null;
}

function buildInsights(location: NormalizedLocation): Record<string, number> {
  const insights: Record<string, number> = {};

  if (location.tags) {
    insights.tagCount = location.tags.length;
  }

  if (location.additionalEmails) {
    insights.additionalEmailCount = location.additionalEmails.length;
  }

  if (location.teamMembers) {
    insights.teamMemberCount = location.teamMembers.length;
  }

  return insights;
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

  let body: DetailRequestBody = {};

  try {
    body = (await req.json()) as DetailRequestBody;
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
  const detailUrl = `${baseUrl}/locations/${encodeURIComponent(locationId)}`;

  let payload: unknown = null;

  try {
    const ghlResponse = await fetch(detailUrl, {
      method: 'GET',
      headers: buildGhlHeaders(apiKey),
      cache: 'no-store',
    });

    const responseText = await ghlResponse.text();
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
        'Failed to retrieve sub-account details from Go High Level.';

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

  const rawLocation = extractLocation(payload);
  const normalized = normalizeLocation(rawLocation ?? payload);

  if (!normalized) {
    return NextResponse.json(
      {
        error: 'The Go High Level API did not return recognizable sub-account details.',
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    location: normalized,
    insights: buildInsights(normalized),
    source: {
      url: detailUrl,
    },
  });
}
