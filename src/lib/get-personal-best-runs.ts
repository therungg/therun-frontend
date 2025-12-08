import { cacheLife } from 'next/cache';
import { type Run } from '../common/types';

export const getPersonalBestRuns = async (): Promise<Run[]> => {
    'use cache';
    cacheLife('minutes');

    const url = `${process.env.NEXT_PUBLIC_DATA_URL}/runs`;

    const res = await fetch(url);
    const json = await res.json();

    return json.result;
};
