// Strava OAuth — SERVER-ONLY. Builds the authorize URL and exchanges/refreshes
// tokens. The client secret is sent only in server-to-server POSTs to Strava.

import {
  STRAVA_AUTHORIZE_URL,
  STRAVA_SCOPE,
  STRAVA_TOKEN_URL,
  type StravaConfig,
} from './config';
import type { StravaTokenResponse } from './types';

/**
 * Build the Strava authorization-code URL. `state` is an opaque CSRF token the
 * callback validates against a cookie. `approvalPrompt: 'force'` lets a re-link
 * re-grant scopes even when the user already authorized once.
 */
export function buildAuthorizeUrl(params: {
  config: StravaConfig;
  redirectUri: string;
  state: string;
  forceApproval?: boolean;
}): string {
  const { config, redirectUri, state, forceApproval } = params;
  const q = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: STRAVA_SCOPE,
    approval_prompt: forceApproval ? 'force' : 'auto',
    state,
  });
  return `${STRAVA_AUTHORIZE_URL}?${q.toString()}`;
}

export class StravaOAuthError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'StravaOAuthError';
  }
}

async function postToken(body: Record<string, string>): Promise<StravaTokenResponse> {
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
    cache: 'no-store',
  });
  const text = await res.text();
  if (!res.ok) {
    throw new StravaOAuthError(
      `Strava token endpoint returned ${res.status}: ${text.slice(0, 300)}`,
      res.status,
    );
  }
  let json: StravaTokenResponse;
  try {
    json = JSON.parse(text) as StravaTokenResponse;
  } catch {
    throw new StravaOAuthError('Strava token endpoint returned non-JSON body');
  }
  if (!json.access_token || !json.refresh_token || !json.expires_at) {
    throw new StravaOAuthError('Strava token response missing required fields');
  }
  return json;
}

/** Exchange an authorization code for tokens (authorization_code grant). */
export function exchangeCode(config: StravaConfig, code: string): Promise<StravaTokenResponse> {
  return postToken({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    grant_type: 'authorization_code',
  });
}

/**
 * Refresh an access token (refresh_token grant). Strava rotates the refresh
 * token, so the caller MUST persist the returned refresh_token.
 */
export function refreshTokens(
  config: StravaConfig,
  refreshToken: string,
): Promise<StravaTokenResponse> {
  return postToken({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
}
