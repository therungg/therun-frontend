import { formatTimeMs } from '~src/lib/run-view/time-format';

/** Signed gap between two times: "+3:34", "−0:12", "+0.412". */
export function formatGap(ms: number): string {
    const sign = ms < 0 ? '−' : '+';
    const abs = Math.abs(ms);
    if (abs < 60_000) return `${sign}${(abs / 1000).toFixed(3)}`;
    return `${sign}${formatTimeMs(abs)}`;
}
