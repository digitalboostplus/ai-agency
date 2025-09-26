#!/usr/bin/env node

/**
 * Helper script to exchange Go High Level authorization codes or refresh tokens.
 * It outputs the resulting access token and optionally updates .env.local with
 * the latest refresh token for local development.
 */

const fs = require('node:fs/promises');
const path = require('node:path');

const DEFAULT_ENDPOINT = process.env.GHL_PRIVATE_TOKEN_ENDPOINT?.trim() ||
  'https://services.leadconnectorhq.com/oauth/token';
const DEFAULT_USER_TYPE = process.env.GHL_PRIVATE_USER_TYPE?.trim() || 'Company';
const ENV_FILE = path.resolve(process.cwd(), '.env.local');

function parseArgs(argv) {
  const options = {
    code: null,
    refreshToken: null,
    clientId: process.env.GHL_PRIVATE_CLIENT_ID?.trim() || null,
    clientSecret: process.env.GHL_PRIVATE_CLIENT_SECRET?.trim() || null,
    redirectUri: process.env.GHL_PRIVATE_REDIRECT_URI?.trim() || null,
    endpoint: DEFAULT_ENDPOINT,
    userType: DEFAULT_USER_TYPE,
    save: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg.startsWith('--')) {
      continue;
    }

    const [flag, value] = arg.includes('=') ? arg.split('=', 2) : [arg, null];

    switch (flag) {
      case '--code':
        options.code = value ?? argv[++index] ?? null;
        break;
      case '--refresh-token':
      case '--refresh':
        options.refreshToken = value ?? argv[++index] ?? null;
        break;
      case '--client-id':
        options.clientId = value ?? argv[++index] ?? null;
        break;
      case '--client-secret':
        options.clientSecret = value ?? argv[++index] ?? null;
        break;
      case '--redirect-uri':
        options.redirectUri = value ?? argv[++index] ?? null;
        break;
      case '--endpoint':
        options.endpoint = value ?? argv[++index] ?? DEFAULT_ENDPOINT;
        break;
      case '--user-type':
        options.userType = value ?? argv[++index] ?? DEFAULT_USER_TYPE;
        break;
      case '--save':
        options.save = true;
        break;
      default:
        console.warn(`Unknown flag ${flag} ignored.`);
        break;
    }
  }

  return options;
}

function assertCredentials({ clientId, clientSecret }) {
  if (!clientId || !clientId.trim()) {
    throw new Error('Missing client ID. Pass --client-id or set GHL_PRIVATE_CLIENT_ID.');
  }

  if (!clientSecret || !clientSecret.trim()) {
    throw new Error('Missing client secret. Pass --client-secret or set GHL_PRIVATE_CLIENT_SECRET.');
  }

  return {
    clientId: clientId.trim(),
    clientSecret: clientSecret.trim(),
  };
}

async function requestToken(config) {
  const { code, refreshToken, redirectUri, endpoint, userType } = config;
  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    user_type: userType,
  });

  if (refreshToken) {
    params.set('grant_type', 'refresh_token');
    params.set('refresh_token', refreshToken);
  } else if (code) {
    params.set('grant_type', 'authorization_code');
    params.set('code', code);
    if (!redirectUri || !redirectUri.trim()) {
      throw new Error('redirect_uri is required when exchanging an authorization code. Use --redirect-uri or set GHL_PRIVATE_REDIRECT_URI.');
    }
    params.set('redirect_uri', redirectUri.trim());
  } else {
    throw new Error('Provide either --refresh-token or --code.');
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const text = await response.text();
  let payload = {};

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (error) {
      console.error('Failed to parse JSON response. Raw body:');
      console.error(text);
      throw error;
    }
  }

  if (!response.ok) {
    const message = (typeof payload.error_description === 'string' && payload.error_description) ||
      (typeof payload.message === 'string' && payload.message) ||
      (typeof payload.error === 'string' && payload.error) ||
      `Token request failed with status ${response.status}.`;
    throw new Error(message);
  }

  const accessToken = typeof payload.access_token === 'string' ? payload.access_token.trim() : '';
  const newRefreshToken = typeof payload.refresh_token === 'string' ? payload.refresh_token.trim() : null;
  const expiresInRaw = payload.expires_in;
  const expiresIn = typeof expiresInRaw === 'number'
    ? expiresInRaw
    : Number.parseInt(typeof expiresInRaw === 'string' ? expiresInRaw : '', 10);

  if (!accessToken) {
    throw new Error('Token response did not include an access_token.');
  }

  return {
    accessToken,
    refreshToken: newRefreshToken,
    expiresIn: Number.isFinite(expiresIn) ? expiresIn : null,
    raw: payload,
  };
}

async function upsertEnvValues(values) {
  let current = '';

  try {
    current = await fs.readFile(ENV_FILE, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  const lines = current
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));

  const map = new Map();
  for (const line of lines) {
    const [key, ...rest] = line.split('=');
    if (!key) {
      continue;
    }
    map.set(key.trim(), rest.join('='));
  }

  for (const [key, value] of Object.entries(values)) {
    if (!value) {
      continue;
    }
    map.set(key, value);
  }

  const nextContent = `${Array.from(map.entries()).map(([key, value]) => `${key}=${value}`).join('\n')}\n`;
  await fs.writeFile(ENV_FILE, nextContent, 'utf8');
}

(async () => {
  try {
    const options = parseArgs(process.argv.slice(2));
    const credentials = assertCredentials(options);
    const token = await requestToken({
      ...options,
      ...credentials,
    });

    console.log('Access token:');
    console.log(token.accessToken);

    if (token.expiresIn !== null) {
      console.log(`Expires in: ${token.expiresIn} seconds`);
    }

    if (token.refreshToken) {
      console.log('Refresh token:');
      console.log(token.refreshToken);
    }

    if (options.save && token.refreshToken) {
      await upsertEnvValues({
        GHL_PRIVATE_REFRESH_TOKEN: token.refreshToken,
      });
      console.log(`Saved refresh token to ${ENV_FILE}`);
    }

    if (!token.refreshToken) {
      console.warn('No refresh_token returned. Ensure your integration is allowed to issue refresh tokens.');
    }
  } catch (error) {
    console.error('Token refresh failed:');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
})();
