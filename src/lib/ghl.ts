export interface NormalizedAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface NormalizedTeamMember {
  id: string;
  name?: string;
  email?: string;
  role?: string;
}

export interface NormalizedLocation {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  website?: string;
  timezone?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  address?: NormalizedAddress;
  tags?: string[];
  additionalEmails?: string[];
  teamMembers?: NormalizedTeamMember[];
  raw?: Record<string, unknown>;
}

export const DEFAULT_GHL_BASE_URL = "https://rest.gohighlevel.com/v1";

export function sanitiseBaseUrl(candidate: unknown): string {
  if (typeof candidate === "string") {
    const trimmed = candidate.trim();
    if (trimmed.length > 0) {
      const cleaned = trimmed.replace(/\/+$/, "");
      if (/^https?:\/\//i.test(cleaned)) {
        return cleaned;
      }
    }
  }

  return DEFAULT_GHL_BASE_URL;
}

export function buildGhlHeaders(apiKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
    Version: "2021-07-28",
  } satisfies HeadersInit;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getOptionalString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}

function getOptionalDateString(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    const fromNumber = Number.parseInt(trimmed, 10);
    if (!Number.isNaN(fromNumber) && trimmed.length >= 10) {
      const dateFromNumber = new Date(fromNumber);
      if (!Number.isNaN(dateFromNumber.getTime())) {
        return dateFromNumber.toISOString();
      }
    }

    const date = new Date(trimmed);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }

    return trimmed;
  }

  return undefined;
}

function collectStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const results = value
    .map((item) => getOptionalString(item))
    .filter((item): item is string => typeof item === "string" && item.length > 0);

  return results.length > 0 ? Array.from(new Set(results)) : undefined;
}

function resolveAddress(raw: Record<string, unknown>): NormalizedAddress | undefined {
  const candidates: unknown[] = [
    raw.address,
    raw.companyAddress,
    raw.locationAddress,
    raw.billingAddress,
    raw.shippingAddress,
  ];

  let addressRecord: Record<string, unknown> | undefined;
  for (const candidate of candidates) {
    if (isRecord(candidate)) {
      addressRecord = candidate;
      break;
    }
  }

  const line1 =
    getOptionalString(addressRecord?.address1) ??
    getOptionalString(addressRecord?.line1) ??
    getOptionalString(raw.address1) ??
    getOptionalString(raw.addressLine1) ??
    getOptionalString(raw.address);

  const line2 =
    getOptionalString(addressRecord?.address2) ??
    getOptionalString(addressRecord?.line2) ??
    getOptionalString(raw.address2) ??
    getOptionalString(raw.addressLine2);

  const city =
    getOptionalString(addressRecord?.city) ??
    getOptionalString(raw.city);

  const state =
    getOptionalString(addressRecord?.state) ??
    getOptionalString(addressRecord?.province) ??
    getOptionalString(raw.state);

  const postalCode =
    getOptionalString(addressRecord?.postalCode) ??
    getOptionalString(addressRecord?.zip) ??
    getOptionalString(addressRecord?.zipCode) ??
    getOptionalString(raw.postalCode) ??
    getOptionalString(raw.zip);

  const country =
    getOptionalString(addressRecord?.country) ??
    getOptionalString(raw.country);

  const hasAddress = line1 || line2 || city || state || postalCode || country;
  if (!hasAddress) {
    return undefined;
  }

  return {
    line1,
    line2,
    city,
    state,
    postalCode,
    country,
  };
}

function parseTeamMember(value: unknown): NormalizedTeamMember | null {
  if (!isRecord(value)) {
    return null;
  }

  const id =
    getOptionalString(value.id) ??
    getOptionalString(value.userId) ??
    getOptionalString(value.memberId) ??
    getOptionalString(value.contactId);

  if (!id) {
    return null;
  }

  const name =
    getOptionalString(value.name) ??
    getOptionalString(value.fullName) ??
    getOptionalString(value.displayName);

  const email =
    getOptionalString(value.email) ??
    getOptionalString(value.userEmail);

  const role =
    getOptionalString(value.role) ??
    getOptionalString(value.userType);

  return {
    id,
    name,
    email,
    role,
  };
}

function resolveTeamMembers(raw: Record<string, unknown>): NormalizedTeamMember[] | undefined {
  const potentialSources: unknown[] = [
    raw.teamMembers,
    raw.users,
    raw.assignedUsers,
    raw.locationUsers,
  ];

  const results: NormalizedTeamMember[] = [];
  const seen = new Set<string>();

  for (const source of potentialSources) {
    if (!Array.isArray(source)) {
      continue;
    }

    for (const entry of source) {
      const member = parseTeamMember(entry);
      if (member && !seen.has(member.id)) {
        seen.add(member.id);
        results.push(member);
      }
    }
  }

  return results.length > 0 ? results : undefined;
}

export function normalizeLocation(raw: unknown): NormalizedLocation | null {
  if (!isRecord(raw)) {
    return null;
  }

  const id =
    getOptionalString(raw.id) ??
    getOptionalString(raw.locationId) ??
    getOptionalString(raw._id) ??
    getOptionalString(raw.uid);

  if (!id) {
    return null;
  }

  const name =
    getOptionalString(raw.name) ??
    getOptionalString(raw.companyName) ??
    getOptionalString(raw.locationName);

  const email =
    getOptionalString(raw.email) ??
    getOptionalString(raw.contactEmail) ??
    getOptionalString(raw.supportEmail) ??
    getOptionalString(raw.companyEmail);

  const phone =
    getOptionalString(raw.phone) ??
    getOptionalString(raw.contactPhone) ??
    getOptionalString(raw.companyPhone) ??
    getOptionalString(raw.phoneNumber);

  const website =
    getOptionalString(raw.website) ??
    getOptionalString(raw.companyWebsite) ??
    getOptionalString(raw.url) ??
    getOptionalString(raw.domain);

  const timezone =
    getOptionalString(raw.timezone) ??
    getOptionalString(raw.timeZone) ??
    getOptionalString(raw.locationTimeZone);

  const status =
    getOptionalString(raw.status) ??
    getOptionalString(raw.accountStatus);

  const createdAt =
    getOptionalDateString(raw.createdAt) ??
    getOptionalDateString(raw.dateAdded) ??
    getOptionalDateString(raw.created);

  const updatedAt =
    getOptionalDateString(raw.updatedAt) ??
    getOptionalDateString(raw.modifiedAt) ??
    getOptionalDateString(raw.lastUpdated) ??
    getOptionalDateString(raw.updated);

  const address = resolveAddress(raw);
  const tags = collectStringArray(raw.tags) ?? collectStringArray(raw.tagNames);
  const additionalEmails =
    collectStringArray(raw.additionalEmails) ??
    collectStringArray(raw.emails) ??
    collectStringArray(raw.altEmails);

  const teamMembers = resolveTeamMembers(raw);

  const normalized: NormalizedLocation = {
    id,
    name,
    email,
    phone,
    website,
    timezone,
    status,
    createdAt,
    updatedAt,
    address,
    tags,
    additionalEmails,
    teamMembers,
    raw,
  };

  return normalized;
}
