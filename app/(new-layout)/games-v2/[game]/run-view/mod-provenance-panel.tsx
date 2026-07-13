import type {
    HistoryEvent,
    RunProvenance,
} from '../../../../../types/moderation.types';

// Stub — replaced by Task 11 with the full mod timeline.
export function ModProvenancePanel(_props: {
    provenance: RunProvenance | null;
    history: HistoryEvent[];
    gameSlug: string;
    runId: number | null;
}) {
    return null;
}
