import useSWR from 'swr';
import type { LiveRun } from '~app/(new-layout)/live/live.types';
import { fetcher } from '~src/utils/fetcher';

const searchable = (value: string) => value.toLowerCase().replace(/\s/g, '');

export function useGameLiveRuns(game: string) {
    const { data } = useSWR<LiveRun[] | null>('/api/live', fetcher);
    if (!data) return data;
    const g = searchable(game);
    return data.filter((run) => searchable(run.game) === g);
}
