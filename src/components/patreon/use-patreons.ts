'use client';
import useSWR from 'swr';
import { PatronMap } from '../../../types/patreon.types';
import { fetcher } from '../../utils/fetcher';

export const usePatreons = () => {
    return useSWR<PatronMap>('/api/patreons', fetcher);
};
