import { cacheLife } from 'next/cache';
import { dataUrl } from '~src/lib/data-url';
import { type Run } from '../common/types';

export const getPersonalBestRuns = async (): Promise<Run[]> => {
    'use cache';
    cacheLife('minutes');

    const url = dataUrl('/runs');

    const res = await fetch(url);
    const json = await res.json();

    return json.result;
};
