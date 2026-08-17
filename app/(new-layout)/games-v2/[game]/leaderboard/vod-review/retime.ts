import type { VodMarker } from '../../../../../../types/leaderboards.types';

export const FPS_PRESETS = [60, 30] as const;
export const MAX_FPS = 240;

/** Player time → frame index. The epsilon absorbs float noise on exact boundaries. */
export function frameFromSeconds(seconds: number, fps: number): number {
    return Math.max(0, Math.floor(seconds * fps + 1e-6));
}

/** Frame index → the seek time that lands inside that frame. */
export function secondsFromFrame(frame: number, fps: number): number {
    return (frame + 0.5) / fps;
}

export function retimeMs(markers: VodMarker[], fps: number): number | null {
    const start = markers.find((m) => m.kind === 'start');
    const end = markers.find((m) => m.kind === 'end');
    if (!start || !end) return null;
    return Math.round(((end.frame - start.frame) / fps) * 1000);
}

/** h:mm:ss.mmm (hours omitted when zero). */
export function formatMs(ms: number): string {
    const sign = ms < 0 ? '−' : '';
    const abs = Math.abs(ms);
    const h = Math.floor(abs / 3_600_000);
    const m = Math.floor((abs % 3_600_000) / 60_000);
    const s = Math.floor((abs % 60_000) / 1000);
    const milli = abs % 1000;
    const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
    return `${sign}${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}.${String(milli).padStart(3, '0')}`;
}

export function formatFrameTime(frame: number, fps: number): string {
    return formatMs(Math.round((frame / fps) * 1000));
}

export function formatDeltaMs(ms: number): string {
    if (ms === 0) return '±0.000';
    const sign = ms > 0 ? '+' : '−';
    return `${sign}${(Math.abs(ms) / 1000).toFixed(3)}`;
}

/** Add a marker; start/end are singletons and replace, others append. Always sorted by frame. */
export function setMarker(
    markers: VodMarker[],
    marker: VodMarker,
): VodMarker[] {
    const singleton = marker.kind === 'start' || marker.kind === 'end';
    const rest = singleton
        ? markers.filter((m) => m.kind !== marker.kind)
        : markers;
    return [...rest, marker].sort((a, b) => a.frame - b.frame);
}

export function removeMarkerAt(
    markers: VodMarker[],
    index: number,
): VodMarker[] {
    return markers.filter((_, i) => i !== index);
}
