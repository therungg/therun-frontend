const MEDALS: Record<number, string> = { 1: 'gold', 2: 'silver', 3: 'bronze' };

export const medalOf = (rank: number | null | undefined) =>
    rank == null ? undefined : MEDALS[rank];

export function ordinal(n: number): string {
    const tens = n % 100;
    if (tens >= 11 && tens <= 13) return `${n}th`;
    switch (n % 10) {
        case 1:
            return `${n}st`;
        case 2:
            return `${n}nd`;
        case 3:
            return `${n}rd`;
        default:
            return `${n}th`;
    }
}

/** "Any%" from "Grand Theft Auto#Any%": run keys carry their game in front. */
export function categoryOf(run: {
    game: string;
    run: string;
    displayRun?: string;
}): string {
    const name = run.displayRun || run.run;
    for (const prefix of [`${run.game}#`, `${run.game.split('#')[0]}#`]) {
        if (name.startsWith(prefix)) return name.slice(prefix.length);
    }
    return name;
}

export const plural = (n: number, one: string, many: string) =>
    `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;
