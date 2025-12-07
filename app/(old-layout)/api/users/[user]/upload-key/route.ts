import { NextRequest } from 'next/server';
import { apiResponse } from '~app/(old-layout)/api/response';
import { getUploadKey } from '~src/lib/get-upload-key';

export async function GET(
    _request: NextRequest,
    props: {
        params: Promise<{ user: string }>;
    },
) {
    const params = await props.params;
    const { user } = params;
    const userData = await getUploadKey(user);

    return apiResponse({
        body: userData,
    });
}
