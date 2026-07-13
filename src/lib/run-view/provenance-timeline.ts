import type {
    HistoryEvent,
    RunProvenance,
} from '../../../types/moderation.types';
import { describeEvent } from './describe-event';

export interface TimelineItem {
    at: string | null; // ISO; null = unknown (pre-column ingest) — sorts first
    kind: 'ingest' | 'reassignment' | 'identity' | 'history';
    label: string;
    sub: string | null;
    struck: boolean;
}

const INGEST_LABEL: Record<string, string> = {
    timer: 'Ingested from a LiveSplit upload',
    guest_submit: 'Submitted as a guest run',
    submission: 'Submitted via the run form',
    manual_mod: 'Manual time asserted by a moderator',
    manual_self: 'Manual time self-claimed by the runner',
};

export function buildProvenanceTimeline(
    prov: RunProvenance | null,
    history: HistoryEvent[],
): TimelineItem[] {
    const items: TimelineItem[] = [];

    if (prov) {
        const ing = prov.ingest;
        const bits = [
            ing.submittedBy ? `by ${ing.submittedBy.name}` : null,
            ing.createdBy ? `by ${ing.createdBy.name}` : null,
            ing.platform ? `platform ${ing.platform}` : null,
            ing.emulator ? 'emulator' : null,
            ing.reason ? `"${ing.reason}"` : null,
        ].filter(Boolean);
        items.push({
            at: ing.ingestedAt,
            kind: 'ingest',
            label: ing.path
                ? (INGEST_LABEL[ing.path] ?? ing.path)
                : 'Origin unknown',
            sub: bits.length ? bits.join(' · ') : null,
            struck: false,
        });
        for (const r of prov.reassignments) {
            items.push({
                at: r.movedAt,
                kind: 'reassignment',
                label: `Originally on ${r.from.gameName} / ${r.from.categoryName} — moved to ${r.to.gameName} / ${r.to.categoryName}`,
                sub: r.performedBy ? `by ${r.performedBy.name}` : null,
                struck: r.undoneAt != null,
            });
        }
        for (const m of prov.identity) {
            items.push({
                at: m.mergedAt,
                kind: 'identity',
                label: m.fromGuestName
                    ? `Guest "${m.fromGuestName}" merged into ${m.to?.name ?? 'account'}`
                    : `Identity moved to ${m.to?.name ?? 'account'}`,
                sub: m.performedBy ? `by ${m.performedBy.name}` : null,
                struck: false,
            });
        }
    }

    for (const e of history) {
        items.push({
            at: e.at,
            kind: 'history',
            label: describeEvent(e),
            sub: e.reason ? `"${e.reason}"` : null,
            struck: false,
        });
    }

    return items.sort((a, b) => {
        if (a.at === null) return -1;
        if (b.at === null) return 1;
        return a.at.localeCompare(b.at);
    });
}
