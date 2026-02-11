import { NextRequest, NextResponse } from 'next/server';
import { apiResponse } from '~app/(old-layout)/api/response';
import { getSession } from '~src/actions/session.action';
import { confirmPermission } from '~src/rbac/confirm-permission';

const BASE_URL = process.env.NEXT_PUBLIC_DATA_URL;

export async function GET(request: NextRequest) {
    try {
        const user = await getSession();
        confirmPermission(user, 'moderate', 'roles');
    } catch {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const qs = searchParams.toString();
    const url = `${BASE_URL}/v1/finished-runs${qs ? `?${qs}` : ''}`;

    const res = await fetch(url);
    const body = await res.json();

    return apiResponse({ body, status: res.status });
}
