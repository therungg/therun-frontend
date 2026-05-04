import { cacheLife, cacheTag } from 'next/cache';
import {
    getTournament,
    getTournamentStats,
    listTournaments,
} from '~src/lib/api/tournaments';

export const getTournaments = async () => {
    'use cache';
    cacheLife('seconds');
    cacheTag('tournaments');
    return listTournaments();
};

export const getTournamentByName = async (name: string) => {
    'use cache';
    cacheLife('seconds');
    cacheTag('tournaments');
    return getTournament(name);
};

export const getTournamentStatsByName = async (name: string) => {
    'use cache';
    cacheLife('seconds');
    cacheTag('tournaments');
    return getTournamentStats(name);
};
