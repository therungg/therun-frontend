import { cacheLife } from 'next/cache';
import { apiResponse } from '../response';
import { getAllPatrons } from './get-all-patrons.action';

export async function GET() {
    const result = await getAllPatrons();
    return apiResponse({
        body: result,
        cache: {
            maxAge: 12000,
            swr: 12000,
        },
    });
}
