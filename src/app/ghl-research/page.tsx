'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import {
  DEFAULT_GHL_BASE_URL,
  NormalizedAddress,
  NormalizedLocation,
} from '@/lib/ghl';

interface ListApiResponse {
  locations?: NormalizedLocation[];
  meta?: Record<string, unknown> | null;
  query?: {
    limit: number;
    searchTerm: string;
    baseUrl: string;
  };
  source?: {
    url: string;
  };
  error?: string;
}

interface DetailApiResponse {
  location?: NormalizedLocation;
  insights?: Record<string, number>;
  source?: {
    url: string;
  };
  error?: string;
}

interface CachedDetail {
  location: NormalizedLocation;
  insights: Record<string, number> | null;
  source: { url: string } | null;
}

const LIMIT_OPTIONS = [25, 50, 100, 200, 500];

function formatDate(value?: string): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function formatAddress(address?: NormalizedAddress): string | undefined {
  if (!address) {
    return undefined;
  }

  const lineOneParts = [address.line1, address.line2].filter((part) => Boolean(part && part.length > 0));
  const cityState =
    [address.city, address.state].filter((part) => Boolean(part && part.length > 0)).join(', ');
  const postalCountry =
    [address.postalCode, address.country].filter((part) => Boolean(part && part.length > 0)).join(' ');

  const parts = [lineOneParts.join(', '), cityState, postalCountry].filter(
    (part) => Boolean(part && part.length > 0),
  );

  if (parts.length === 0) {
    return undefined;
  }

  return parts.join('\n');
}

function buildSearchHaystack(location: NormalizedLocation): string {
  const values: string[] = [location.id];

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

  return values
    .map((value) => value.toLowerCase())
    .join(' ');
}

function DetailField({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value?: string | null;
  multiline?: boolean;
}) {
  const displayValue = value && value.trim().length > 0 ? value : '—';

  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd
        className={`mt-1 text-sm text-slate-900 ${multiline ? 'whitespace-pre-wrap break-words' : ''}`}
      >
        {displayValue}
      </dd>
    </div>
  );
}

export default function GoHighLevelResearchPage() {
  const [apiKey, setApiKey] = useState('');
  const [rememberApiKey, setRememberApiKey] = useState(false);
  const [baseUrl, setBaseUrl] = useState(DEFAULT_GHL_BASE_URL);
  const [limit, setLimit] = useState<number>(50);
  const [searchTerm, setSearchTerm] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [subAccounts, setSubAccounts] = useState<NormalizedLocation[]>([]);
  const [meta, setMeta] = useState<Record<string, unknown> | null>(null);
  const [listSource, setListSource] = useState<{ url: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<NormalizedLocation | null>(null);
  const [detailInsights, setDetailInsights] = useState<Record<string, number> | null>(null);
  const [detailSource, setDetailSource] = useState<{ url: string } | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsCache, setDetailsCache] = useState<Record<string, CachedDetail>>({});
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storedKey = window.localStorage.getItem('ghlApiKey');
    if (storedKey) {
      setApiKey(storedKey);
      setRememberApiKey(true);
    }

    const storedBaseUrl = window.localStorage.getItem('ghlApiBaseUrl');
    if (storedBaseUrl) {
      setBaseUrl(storedBaseUrl);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (rememberApiKey && apiKey.trim().length > 0) {
      window.localStorage.setItem('ghlApiKey', apiKey.trim());
    } else {
      window.localStorage.removeItem('ghlApiKey');
    }
  }, [apiKey, rememberApiKey]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem('ghlApiBaseUrl', baseUrl);
  }, [baseUrl]);

  const filteredSubAccounts = useMemo(() => {
    const normalizedTerm = clientFilter.trim().toLowerCase();
    if (!normalizedTerm) {
      return subAccounts;
    }

    return subAccounts.filter((location) => buildSearchHaystack(location).includes(normalizedTerm));
  }, [clientFilter, subAccounts]);

  const resultsSummary = useMemo(() => {
    if (subAccounts.length === 0) {
      return 'No sub-accounts loaded yet.';
    }

    if (clientFilter.trim().length === 0) {
      return `Loaded ${subAccounts.length} sub-account${subAccounts.length === 1 ? '' : 's'}.`;
    }

    return `Showing ${filteredSubAccounts.length} of ${subAccounts.length} loaded sub-account${
      subAccounts.length === 1 ? '' : 's'
    }.`;
  }, [clientFilter, filteredSubAccounts.length, subAccounts.length]);

  const handleLookup = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const trimmedKey = apiKey.trim();
      if (trimmedKey.length === 0) {
        setError('Please provide a Go High Level API key.');
        return;
      }

      setLoading(true);
      setError(null);
      setSubAccounts([]);
      setMeta(null);
      setListSource(null);
      setSelectedId(null);
      setSelectedDetails(null);
      setDetailInsights(null);
      setDetailSource(null);
      setDetailsError(null);
      setDetailsCache({});
      setCopyState('idle');

      const sanitizedBaseUrl = baseUrl.trim().length > 0 ? baseUrl.trim().replace(/\/+$/, '') : DEFAULT_GHL_BASE_URL;
      if (sanitizedBaseUrl !== baseUrl) {
        setBaseUrl(sanitizedBaseUrl);
      }

      try {
        const response = await fetch('/api/ghl/subaccounts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            apiKey: trimmedKey,
            searchTerm: searchTerm.trim(),
            limit,
            baseUrl: sanitizedBaseUrl,
          }),
        });

        const payload = (await response.json()) as ListApiResponse;

        if (!response.ok) {
          setError(payload?.error ?? 'Unable to fetch sub-accounts from Go High Level.');
          setSubAccounts([]);
          return;
        }

        const locations = Array.isArray(payload.locations) ? payload.locations : [];
        setSubAccounts(locations);
        setMeta(payload.meta ?? null);
        setListSource(payload.source ?? null);
        setClientFilter('');
      } catch {
        setError('We were unable to reach the lookup service. Please try again.');
        setSubAccounts([]);
      } finally {
        setLoading(false);
      }
    },
    [apiKey, baseUrl, limit, searchTerm],
  );

  const handleSelectSubAccount = useCallback(
    async (location: NormalizedLocation) => {
      setSelectedId(location.id);
      setDetailsError(null);
      setCopyState('idle');

      const cached = detailsCache[location.id];
      if (cached) {
        setSelectedDetails(cached.location);
        setDetailInsights(cached.insights);
        setDetailSource(cached.source);
        setDetailsLoading(false);
        return;
      }

      const trimmedKey = apiKey.trim();
      if (trimmedKey.length === 0) {
        setDetailsError('Please provide an API key to load sub-account details.');
        return;
      }

      setDetailsLoading(true);
      setSelectedDetails(null);
      setDetailInsights(null);
      setDetailSource(null);

      const sanitizedBaseUrl = baseUrl.trim().length > 0 ? baseUrl.trim().replace(/\/+$/, '') : DEFAULT_GHL_BASE_URL;
      if (sanitizedBaseUrl !== baseUrl) {
        setBaseUrl(sanitizedBaseUrl);
      }

      try {
        const response = await fetch(`/api/ghl/subaccounts/${encodeURIComponent(location.id)}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            apiKey: trimmedKey,
            baseUrl: sanitizedBaseUrl,
          }),
        });

        const payload = (await response.json()) as DetailApiResponse;

        if (!response.ok) {
          setDetailsError(payload?.error ?? 'Unable to load sub-account details.');
          setDetailsLoading(false);
          return;
        }

        if (!payload.location) {
          setDetailsError('The details response did not include sub-account data.');
          setDetailsLoading(false);
          return;
        }

        setSelectedDetails(payload.location);
        setDetailInsights(payload.insights ?? null);
        setDetailSource(payload.source ?? null);
        setDetailsCache((previous) => ({
          ...previous,
          [location.id]: {
            location: payload.location as NormalizedLocation,
            insights: payload.insights ?? null,
            source: payload.source ?? null,
          },
        }));
      } catch {
        setDetailsError('We were unable to load the selected sub-account. Please try again.');
      } finally {
        setDetailsLoading(false);
      }
    },
    [apiKey, baseUrl, detailsCache],
  );

  const handleCopyRaw = useCallback(async () => {
    if (!selectedDetails?.raw) {
      return;
    }

    const raw = selectedDetails.raw;
    let rawText: string;

    try {
      rawText = JSON.stringify(raw, null, 2);
    } catch {
      setCopyState('error');
      window.setTimeout(() => setCopyState('idle'), 2000);
      return;
    }

    try {
      if (!navigator.clipboard) {
        throw new Error('Clipboard API not available');
      }

      await navigator.clipboard.writeText(rawText);
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      setCopyState('error');
      window.setTimeout(() => setCopyState('idle'), 2000);
    }
  }, [selectedDetails]);

  const rawJson = useMemo(() => {
    if (!selectedDetails?.raw) {
      return '';
    }

    try {
      return JSON.stringify(selectedDetails.raw, null, 2);
    } catch {
      return 'Unable to format raw JSON.';
    }
  }, [selectedDetails]);

  return (
    <main className="min-h-screen bg-slate-100">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <header className="mb-10 space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.4em] text-slate-500">
            Operations / Intelligence
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Go High Level Sub-Account Research Hub
          </h1>
          <p className="max-w-3xl text-base text-slate-600 sm:text-lg">
            Inspect sub-accounts across your agency in seconds. Authenticate with your agency API key, pull
            live data from Go High Level, and drill into each location&apos;s contact information, timezone,
            access list, and raw API payload for deeper investigations.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <form
              onSubmit={handleLookup}
              className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur"
            >
              <div className="space-y-5">
                <div>
                  <label htmlFor="apiKey" className="block text-sm font-semibold text-slate-700">
                    Go High Level API key
                  </label>
                  <p className="mt-1 text-xs text-slate-500">
                    Use an agency-level key with read access. The key is only used from your browser for live
                    lookups and is never stored on our servers.
                  </p>
                  <input
                    id="apiKey"
                    type="password"
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    placeholder="sk_..."
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div>
                  <label htmlFor="baseUrl" className="block text-sm font-semibold text-slate-700">
                    API base URL
                  </label>
                  <p className="mt-1 text-xs text-slate-500">
                    Default is <code className="rounded bg-slate-100 px-1">{DEFAULT_GHL_BASE_URL}</code>. Adjust
                    if your account requires the LeadConnector endpoint.
                  </p>
                  <input
                    id="baseUrl"
                    type="text"
                    value={baseUrl}
                    onChange={(event) => setBaseUrl(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="limit" className="block text-sm font-semibold text-slate-700">
                      Sub-accounts to load
                    </label>
                    <select
                      id="limit"
                      value={limit}
                      onChange={(event) => setLimit(Number(event.target.value))}
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      {LIMIT_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="searchTerm" className="block text-sm font-semibold text-slate-700">
                      Remote search (optional)
                    </label>
                    <input
                      id="searchTerm"
                      type="text"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Name, email, or ID"
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberApiKey}
                    onChange={(event) => setRememberApiKey(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Remember API key in this browser
                </label>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:shadow-blue-500/40 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={loading}
                >
                  {loading ? 'Loading sub-accounts…' : 'Load sub-accounts'}
                </button>
              </div>
            </form>

            <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 text-sm leading-relaxed text-slate-600 shadow-sm backdrop-blur">
              <h2 className="text-base font-semibold text-slate-800">Research tips</h2>
              <ul className="mt-3 space-y-2 list-disc pl-5">
                <li>Filter results locally to zero in on a specific city, timezone, or status.</li>
                <li>Use the detail panel to confirm team access, alternate emails, and raw API payloads.</li>
                <li>Switch the base URL to <code className="rounded bg-slate-100 px-1">https://services.leadconnectorhq.com/v1</code> if required for your workspace.</li>
              </ul>
            </div>
          </aside>

          <section className="space-y-6">
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-700 shadow-sm">
                {error}
              </div>
            )}

            <div className="rounded-3xl border border-slate-200 bg-white/80 shadow-sm backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 px-6 py-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Sub-accounts</h2>
                  <p className="text-sm text-slate-500">{resultsSummary}</p>
                </div>
                {listSource?.url && (
                  <a
                    href={listSource.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-blue-400 hover:text-blue-600"
                  >
                    View API request ↗
                  </a>
                )}
              </div>
              <div className="space-y-4 px-6 py-5">
                <div>
                  <label htmlFor="clientFilter" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Filter loaded results
                  </label>
                  <input
                    id="clientFilter"
                    type="text"
                    value={clientFilter}
                    onChange={(event) => setClientFilter(event.target.value)}
                    placeholder="Search loaded data by name, email, city, or tag"
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    disabled={loading || subAccounts.length === 0}
                  />
                </div>

                <div className="max-h-[28rem] overflow-y-auto pr-2">
                  {loading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
                      ))}
                    </div>
                  ) : filteredSubAccounts.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-10 text-center text-sm text-slate-500">
                      {subAccounts.length === 0
                        ? 'Load your agency sub-accounts to begin the analysis.'
                        : 'No results match the current filter.'}
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {filteredSubAccounts.map((location) => {
                        const isSelected = location.id === selectedId;
                        const address = formatAddress(location.address);

                        return (
                          <li key={location.id}>
                            <button
                              type="button"
                              onClick={() => handleSelectSubAccount(location)}
                              className={`w-full rounded-2xl border px-5 py-4 text-left shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50/80 text-blue-900'
                                  : 'border-slate-200 bg-white text-slate-900 hover:border-blue-200 hover:bg-blue-50/50'
                              }`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <p className="text-base font-semibold">
                                    {location.name ?? 'Unnamed sub-account'}
                                  </p>
                                  <p className="text-xs text-slate-500">ID: {location.id}</p>
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                                  {location.status && (
                                    <span className="rounded-full bg-slate-100 px-2 py-1 font-medium text-slate-600">
                                      {location.status}
                                    </span>
                                  )}
                                  {location.timezone && (
                                    <span className="rounded-full bg-slate-100 px-2 py-1 font-medium text-slate-600">
                                      {location.timezone}
                                    </span>
                                  )}
                                  {location.tags?.slice(0, 2).map((tag) => (
                                    <span
                                      key={tag}
                                      className="rounded-full bg-blue-100 px-2 py-1 font-medium text-blue-700"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                  {location.tags && location.tags.length > 2 && (
                                    <span className="rounded-full bg-blue-50 px-2 py-1 font-medium text-blue-600">
                                      +{location.tags.length - 2} more
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                                <div>
                                  <span className="font-medium text-slate-500">Email:</span>{' '}
                                  {location.email ?? '—'}
                                </div>
                                <div>
                                  <span className="font-medium text-slate-500">Phone:</span>{' '}
                                  {location.phone ?? '—'}
                                </div>
                                <div>
                                  <span className="font-medium text-slate-500">Created:</span>{' '}
                                  {formatDate(location.createdAt)}
                                </div>
                              </div>

                              {address && (
                                <p className="mt-2 text-sm text-slate-500">
                                  <span className="font-medium text-slate-500">Address:</span>{' '}
                                  <span className="whitespace-pre-wrap">{address}</span>
                                </p>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {(meta || listSource) && (
              <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
                <h2 className="text-lg font-semibold text-slate-900">API metadata</h2>
                {listSource?.url && (
                  <p className="mt-1 text-xs text-slate-500">
                    Latest request: <code className="rounded bg-slate-100 px-1">{listSource.url}</code>
                  </p>
                )}
                {meta ? (
                  <pre className="mt-4 max-h-64 overflow-auto rounded-2xl bg-slate-900/95 p-4 text-xs text-slate-100 shadow-inner">
                    {JSON.stringify(meta, null, 2)}
                  </pre>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">No metadata returned for the last request.</p>
                )}
              </div>
            )}

            <div className="rounded-3xl border border-slate-200 bg-white/80 shadow-sm backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 px-6 py-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Sub-account details</h2>
                  <p className="text-sm text-slate-500">
                    Select a sub-account to review its contact information, team access, and raw API payload.
                  </p>
                </div>
                {detailSource?.url && (
                  <a
                    href={detailSource.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-blue-400 hover:text-blue-600"
                  >
                    View detail request ↗
                  </a>
                )}
              </div>

              <div className="space-y-6 px-6 py-6">
                {detailsError && (
                  <div className="rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-700">
                    {detailsError}
                  </div>
                )}

                {detailsLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
                    ))}
                  </div>
                ) : selectedDetails ? (
                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <DetailField label="Sub-account name" value={selectedDetails.name ?? selectedDetails.id} />
                      <DetailField label="Sub-account ID" value={selectedDetails.id} />
                      <DetailField label="Primary email" value={selectedDetails.email} />
                      <DetailField label="Primary phone" value={selectedDetails.phone} />
                      <DetailField label="Website" value={selectedDetails.website} />
                      <DetailField label="Timezone" value={selectedDetails.timezone} />
                      <DetailField label="Status" value={selectedDetails.status} />
                      <DetailField label="Created" value={formatDate(selectedDetails.createdAt)} />
                      <DetailField label="Updated" value={formatDate(selectedDetails.updatedAt)} />
                      <DetailField label="Address" value={formatAddress(selectedDetails.address) ?? undefined} multiline />
                    </div>

                    {detailInsights && Object.keys(detailInsights).length > 0 && (
                      <div className="grid gap-3 sm:grid-cols-3">
                        {Object.entries(detailInsights)
                          .filter(([, value]) => typeof value === 'number' && value > 0)
                          .map(([key, value]) => (
                            <div
                              key={key}
                              className="rounded-2xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-center shadow-sm"
                            >
                              <p className="text-2xl font-semibold text-blue-700">{value}</p>
                              <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </p>
                            </div>
                          ))}
                      </div>
                    )}

                    {selectedDetails.additionalEmails && selectedDetails.additionalEmails.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-slate-800">Additional emails</h3>
                        <ul className="mt-2 space-y-1 text-sm text-slate-600">
                          {selectedDetails.additionalEmails.map((email) => (
                            <li key={email} className="rounded-xl bg-slate-100 px-3 py-1">
                              {email}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedDetails.tags && selectedDetails.tags.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-slate-800">Tags</h3>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {selectedDetails.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedDetails.teamMembers && selectedDetails.teamMembers.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-slate-800">Team members</h3>
                        <ul className="mt-3 space-y-3">
                          {selectedDetails.teamMembers.map((member) => (
                            <li
                              key={member.id}
                              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                            >
                              <p className="text-sm font-semibold text-slate-900">
                                {member.name ?? member.email ?? `User ${member.id}`}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                <span>{member.email ?? 'No email provided'}</span>
                                {member.role && (
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium uppercase tracking-wide text-slate-600">
                                    {member.role}
                                  </span>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {rawJson && (
                      <div>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <h3 className="text-sm font-semibold text-slate-800">Raw JSON payload</h3>
                          <button
                            type="button"
                            onClick={handleCopyRaw}
                            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-blue-400 hover:text-blue-600"
                          >
                            {copyState === 'copied' ? 'Copied!' : copyState === 'error' ? 'Copy failed' : 'Copy raw JSON'}
                          </button>
                        </div>
                        <pre className="max-h-80 overflow-auto rounded-2xl bg-slate-900/95 p-4 text-xs text-slate-100 shadow-inner">
                          {rawJson}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-12 text-center text-sm text-slate-500">
                    Choose a sub-account from the list to load detailed information.
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
