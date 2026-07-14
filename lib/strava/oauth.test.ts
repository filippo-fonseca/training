import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAuthorizeUrl } from './oauth';
import type { StravaConfig } from './config';

const config: StravaConfig = {
  clientId: '12345',
  clientSecret: 'super-secret',
  redirectUriOverride: null,
};

test('buildAuthorizeUrl sets the required OAuth params and scope', () => {
  const url = new URL(
    buildAuthorizeUrl({
      config,
      redirectUri: 'http://localhost:3864/api/strava/callback',
      state: 'abc123',
    }),
  );
  assert.equal(url.origin + url.pathname, 'https://www.strava.com/oauth/authorize');
  const p = url.searchParams;
  assert.equal(p.get('client_id'), '12345');
  assert.equal(p.get('redirect_uri'), 'http://localhost:3864/api/strava/callback');
  assert.equal(p.get('response_type'), 'code');
  assert.equal(p.get('scope'), 'read,activity:read_all');
  assert.equal(p.get('state'), 'abc123');
  assert.equal(p.get('approval_prompt'), 'auto');
});

test('buildAuthorizeUrl forces approval on re-link and never leaks the secret', () => {
  const raw = buildAuthorizeUrl({
    config,
    redirectUri: 'http://localhost:3864/api/strava/callback',
    state: 's',
    forceApproval: true,
  });
  const p = new URL(raw).searchParams;
  assert.equal(p.get('approval_prompt'), 'force');
  assert.equal(raw.includes('super-secret'), false);
});
