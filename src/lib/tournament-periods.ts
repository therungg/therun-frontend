import type { DateRange, Tournament } from '../../types/tournament.types';

export type TournamentState = 'pre' | 'heat' | 'gap' | 'post';

export interface PeriodRef {
    period: DateRange;
    index: number;
}

const periods = (t: Tournament): DateRange[] => t.eligiblePeriods ?? [];

const ms = (iso: string): number => new Date(iso).getTime();

export function detectTournamentState(
    t: Tournament,
    now: number = Date.now(),
): TournamentState {
    const ps = periods(t);
    if (ps.length === 0) return 'pre';

    const first = ms(ps[0].startDate);
    const last = ms(ps[ps.length - 1].endDate);

    if (now < first) return 'pre';
    if (now > last) return 'post';

    for (const p of ps) {
        if (now >= ms(p.startDate) && now <= ms(p.endDate)) return 'heat';
    }
    return 'gap';
}

export function getActivePeriod(
    t: Tournament,
    now: number = Date.now(),
): PeriodRef | null {
    const ps = periods(t);
    for (let i = 0; i < ps.length; i++) {
        if (now >= ms(ps[i].startDate) && now <= ms(ps[i].endDate)) {
            return { period: ps[i], index: i };
        }
    }
    return null;
}

export function getNextPeriod(
    t: Tournament,
    now: number = Date.now(),
): PeriodRef | null {
    const ps = periods(t);
    for (let i = 0; i < ps.length; i++) {
        if (ms(ps[i].startDate) > now) {
            return { period: ps[i], index: i };
        }
    }
    return null;
}

export function getPreviousPeriod(
    t: Tournament,
    now: number = Date.now(),
): PeriodRef | null {
    const ps = periods(t);
    let last: PeriodRef | null = null;
    for (let i = 0; i < ps.length; i++) {
        if (ms(ps[i].endDate) < now) {
            last = { period: ps[i], index: i };
        }
    }
    return last;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function shouldUseDayLabels(t: Tournament): boolean {
    const ps = periods(t);
    if (ps.length < 2) return false;

    const seen = new Set<string>();
    for (const p of ps) {
        const span = ms(p.endDate) - ms(p.startDate);
        if (span > DAY_MS) return false;

        const start = new Date(p.startDate);
        const key = `${start.getFullYear()}-${start.getMonth()}-${start.getDate()}`;
        if (seen.has(key)) return false;
        seen.add(key);
    }
    return true;
}

export function getPeriodLabel(t: Tournament, index: number): string {
    const ps = periods(t);
    if (ps.length <= 1) return 'Tournament window';
    if (shouldUseDayLabels(t)) return `Day ${index + 1}`;
    return `Part ${index + 1}`;
}

export function getPeriodNoun(t: Tournament): {
    singular: string;
    plural: string;
} {
    const ps = periods(t);
    if (ps.length <= 1) return { singular: 'window', plural: 'windows' };
    if (shouldUseDayLabels(t)) return { singular: 'day', plural: 'days' };
    return { singular: 'part', plural: 'parts' };
}

export function periodStatus(
    period: DateRange,
    now: number = Date.now(),
): 'past' | 'active' | 'future' {
    const start = ms(period.startDate);
    const end = ms(period.endDate);
    if (now < start) return 'future';
    if (now > end) return 'past';
    return 'active';
}

export function periodProgress(
    period: DateRange,
    now: number = Date.now(),
): number {
    const start = ms(period.startDate);
    const end = ms(period.endDate);
    if (end <= start) return 1;
    const p = (now - start) / (end - start);
    if (p < 0) return 0;
    if (p > 1) return 1;
    return p;
}
