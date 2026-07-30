import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('~src/lib/live-runs', () => ({
    getLiveRunForUser: vi.fn(),
}));

import { NextRequest } from 'next/server';
import { getLiveRunForUser } from '~src/lib/live-runs';
import { GET } from './route';

const request = new NextRequest('https://therun.gg/api/live/someone');
const props = { params: Promise.resolve({ username: 'someone' }) };

afterEach(() => {
    vi.clearAllMocks();
});

describe('GET /api/live/[username]', () => {
    it('returns the live run as JSON when one exists', async () => {
        vi.mocked(getLiveRunForUser).mockResolvedValue({ user: 'someone' });
        const res = await GET(request, props);
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ user: 'someone' });
    });

    // getLiveRunForUser returns undefined when the runner has no live run
    // (backend answers {"error":"No results"}). NextResponse.json(undefined)
    // throws "Value is not JSON serializable", which 500'd this route for
    // every overlay polling a finished runner.
    it('returns null with a 200 when the runner has no live run', async () => {
        vi.mocked(getLiveRunForUser).mockResolvedValue(undefined);
        const res = await GET(request, props);
        expect(res.status).toBe(200);
        expect(await res.json()).toBeNull();
    });
});
