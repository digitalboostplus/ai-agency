'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DEFAULT_GHL_BASE_URL, NormalizedCustomValue, NormalizedLocation } from '@/lib/ghl';

interface CustomValuesClientProps {
  locationId: string;
}

interface CustomValuesApiResponse {
  customValues?: NormalizedCustomValue[];
  count?: number;
  error?: string;
  warning?: string;
  meta?: Record<string, unknown> | null;
  source?: {
    url: string;
  } | null;
  resolvedBaseUrl?: string;
  attemptedUrls?: string[];
  attemptedBaseUrls?: string[];
  attemptedPaths?: string[];
}

interface DetailApiResponse {
  location?: NormalizedLocation;
  error?: string;
  source?: {
    url: string;
  } | null;
}

function sanitizeLocalBaseUrl(candidate: string): string {
  const trimmed = candidate.trim();
  if (!trimmed) {
    return DEFAULT_GHL_BASE_URL;
  }

  return trimmed.replace(/\/+$/, '');
}

export default function CustomValuesClient({ locationId }: CustomValuesClientProps) {
  const router = useRouter();
  const [baseUrl, setBaseUrl] = useState(DEFAULT_GHL_BASE_URL);
  const [location, setLocation] = useState<NormalizedLocation | null>(null);
  const [customValues, setCustomValues] = useState<NormalizedCustomValue[]>([]);
  const [meta, setMeta] = useState<Record<string, unknown> | null>(null);
  const [source, setSource] = useState<{ url: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [autoLoaded, setAutoLoaded] = useState(false);
  const [filterTerm, setFilterTerm] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storedBaseUrl = window.localStorage.getItem('ghlApiBaseUrl');
    if (storedBaseUrl && storedBaseUrl.trim().length > 0) {
      setBaseUrl(sanitizeLocalBaseUrl(storedBaseUrl));
    }

    setInitialized(true);
  }, []);

  const handleLoad = useCallback(async () => {
    const sanitizedBaseUrl = sanitizeLocalBaseUrl(baseUrl);
    if (sanitizedBaseUrl !== baseUrl) {
      setBaseUrl(sanitizedBaseUrl);
    }

    setLoading(true);
    setError(null);
    setNotice(null);
    setMeta(null);
    setSource(null);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('ghlApiBaseUrl', sanitizedBaseUrl);
    }

    try {
      const detailResponse = await fetch(`/api/ghl/subaccounts/${encodeURIComponent(locationId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          baseUrl: sanitizedBaseUrl,
        }),
      });

      const detailPayload = (await detailResponse.json()) as DetailApiResponse;

      if (!detailResponse.ok) {
        setError(detailPayload?.error ?? 'Unable to load sub-account details.');
        setLoading(false);
        return;
      }

      setLocation(detailPayload.location ?? null);

      const valuesResponse = await fetch(`/api/ghl/subaccounts/${encodeURIComponent(locationId)}/custom-values`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          baseUrl: sanitizedBaseUrl,
        }),
      });

      const valuesPayload = (await valuesResponse.json()) as CustomValuesApiResponse;

      if (!valuesResponse.ok) {
        const attemptLabels = valuesPayload?.attemptedUrls && valuesPayload.attemptedUrls.length > 0
          ? valuesPayload.attemptedUrls
          : valuesPayload?.attemptedBaseUrls?.map((attemptBaseUrl, index) => {
              const pathLabel = valuesPayload.attemptedPaths?.[index] ?? '';
              return pathLabel ? `${attemptBaseUrl}${pathLabel}` : attemptBaseUrl;
            }) ?? [];
        const attemptsSuffix = attemptLabels.length > 0 ? ` (Attempts: ${attemptLabels.join(' -> ')})` : '';
        setError((valuesPayload?.error ?? 'Unable to load custom values for this sub-account.') + attemptsSuffix);
        setCustomValues([]);
        setLoading(false);
        return;
      }

      const notices: string[] = [];

      if (
        valuesPayload.resolvedBaseUrl &&
        valuesPayload.resolvedBaseUrl.trim().length > 0 &&
        valuesPayload.resolvedBaseUrl !== sanitizedBaseUrl
      ) {
        const resolved = sanitizeLocalBaseUrl(valuesPayload.resolvedBaseUrl);
        setBaseUrl(resolved);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('ghlApiBaseUrl', resolved);
        }
        notices.push(`Go High Level responded via ${resolved}. The base URL input has been updated to match.`);
      }

      if (valuesPayload.warning) {
        notices.push(valuesPayload.warning);
      }

      if (valuesPayload.attemptedUrls && valuesPayload.attemptedUrls.length > 0) {
        notices.push(`Attempted endpoints: ${valuesPayload.attemptedUrls.join(' | ')}`);
      }

      setNotice(notices.length > 0 ? notices.join(' ') : null);

      setCustomValues(Array.isArray(valuesPayload.customValues) ? valuesPayload.customValues : []);
      setMeta(valuesPayload.meta ?? null);
      setSource(valuesPayload.source ?? null);
      setError(null);
    } catch (loadError) {
      console.error(loadError);
      setError('We were unable to reach the lookup service. Please try again.');
      setCustomValues([]);
    } finally {
      setLoading(false);
    }
  }, [baseUrl, locationId]);

  useEffect(() => {
    if (!initialized || autoLoaded) {
      return;
    }

    setAutoLoaded(true);
    void handleLoad();
  }, [initialized, autoLoaded, handleLoad]);

  const filteredValues = useMemo(() => {
    const term = filterTerm.trim().toLowerCase();
    if (!term) {
      return customValues;
    }

    return customValues.filter((value) => {
      const haystack = [
        value.id,
        value.name,
        value.slug,
        value.value,
        value.type,
        value.group,
      ]
        .filter(Boolean)
        .map((item) => (item ?? '').toLowerCase());

      return haystack.some((entry) => entry.includes(term));
    });
  }, [customValues, filterTerm]);

  const heading = location?.name ?? `Sub-account ${locationId}`;

  return (
    <div className="bg-slate-100 pb-16">
      <div className="mx-auto max-w-6xl px-4 pt-28 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button
            type="button"
            className="text-sm font-semibold text-blue-600 hover:text-blue-500"
            onClick={() => router.push('/ghl-research')}
          >
            Back to sub-account lookup
          </button>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-sm backdrop-blur">
          <header className="mb-8 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">
              Custom Values
            </p>
            <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">{heading}</h1>
            <p className="text-sm text-slate-600">
              Fetch and inspect every custom value stored on this sub-account. Responses come directly from Go
              High Level using the agency&apos;s private integration credentials and are never persisted by this
              tool.
            </p>
          </header>

          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-2 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-xs text-blue-700">
              <span className="text-sm font-semibold text-blue-800">Authentication</span>
              <p>
                Requests authenticate automatically using the agency&apos;s private integration credentials. Update
                the base URL if the LeadConnector host is required for this sub-account.
              </p>
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">API base URL</span>
              <input
                type="text"
                value={baseUrl}
                onChange={(event) => setBaseUrl(event.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <span className="text-xs text-slate-500">
                Default: {DEFAULT_GHL_BASE_URL}. Switch to the LeadConnector endpoint if required.
              </span>
            </label>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => void handleLoad()}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:shadow-blue-500/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Loading custom values...' : 'Load custom values'}
            </button>

            <input
              type="text"
              value={filterTerm}
              onChange={(event) => setFilterTerm(event.target.value)}
              placeholder="Filter by name, slug, value, or group"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 sm:w-64"
              disabled={loading || customValues.length === 0}
            />
          </div>

          {error && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {notice && !error && (
            <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              {notice}
            </div>
          )}

          <section className="mt-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-600">
                Showing {filteredValues.length} of {customValues.length} custom value{customValues.length === 1 ? '' : 's'}.
              </p>
              {source?.url && (
                <p className="text-xs text-slate-500">
                  Source endpoint: <code className="rounded bg-slate-100 px-1">{source.url}</code>
                </p>
              )}
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
                ))}
              </div>
            ) : filteredValues.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-10 text-center text-sm text-slate-500">
                {customValues.length === 0
                  ? 'Load custom values for this sub-account to begin your review.'
                  : 'No custom values match the current filter.'}
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <th scope="col" className="px-4 py-3">Name</th>
                      <th scope="col" className="px-4 py-3">Slug</th>
                      <th scope="col" className="px-4 py-3">Value</th>
                      <th scope="col" className="px-4 py-3">Group</th>
                      <th scope="col" className="px-4 py-3">Type</th>
                      <th scope="col" className="px-4 py-3">Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white text-sm text-slate-700">
                    {filteredValues.map((cv) => (
                      <tr key={cv.id} className="align-top">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">{cv.name ?? 'Untitled value'}</p>
                          <p className="mt-1 text-xs text-slate-500">ID: {cv.id}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{cv.slug ?? '-'}</td>
                        <td className="px-4 py-3 text-xs">
                          <code className="break-words rounded bg-slate-100 px-2 py-1">{cv.value ?? '-'}</code>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{cv.group ?? '-'}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{cv.type ?? '-'}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{cv.updatedAt ?? cv.createdAt ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {meta && (
              <div>
                <h2 className="text-sm font-semibold text-slate-700">API metadata</h2>
                <pre className="mt-3 max-h-60 overflow-auto rounded-2xl bg-slate-900/95 p-4 text-xs text-slate-100 shadow-inner">
                  {JSON.stringify(meta, null, 2)}
                </pre>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
