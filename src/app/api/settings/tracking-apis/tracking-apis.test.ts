import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { NextRequest } from 'next/server';
import { GET as getTrackingApis, PATCH as patchTrackingApis } from './route';
import { POST as postTrackingApisTest } from './test/route';

describe('Tracking APIs Settings Routes', () => {
  it('blocks unauthorized access to GET /api/settings/tracking-apis', async () => {
    // Calling without active session returns 401
    const res = await getTrackingApis();
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.message, 'Unauthorized');
  });

  it('blocks unauthorized access to POST /api/settings/tracking-apis/test', async () => {
    const req = new NextRequest('http://localhost:3000/api/settings/tracking-apis/test', {
      method: 'POST',
      body: JSON.stringify({ target: 'supabase-ping' }),
    });
    const res = await postTrackingApisTest(req);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.message, 'Unauthorized');
  });

  it('blocks unauthorized access to PATCH /api/settings/tracking-apis', async () => {
    const req = new NextRequest('http://localhost:3000/api/settings/tracking-apis', {
      method: 'PATCH',
      body: JSON.stringify({ subscriptionStatus: 'enterprise' }),
    });
    const res = await patchTrackingApis(req);
    assert.equal(res.status, 401);
  });
});
