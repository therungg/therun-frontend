import { buildProvenanceTimeline } from '~src/lib/run-view/provenance-timeline';
import type {
    HistoryEvent,
    RunProvenance,
} from '../../../../../types/moderation.types';

function formatAt(at: string | null): string {
    if (at === null) return 'date unknown';
    return new Date(at).toLocaleString();
}

export function ModProvenancePanel({
    provenance,
    history,
    gameSlug: _gameSlug,
    runId: _runId,
}: {
    provenance: RunProvenance | null;
    history: HistoryEvent[];
    gameSlug: string;
    runId: number | null;
}) {
    const timeline = buildProvenanceTimeline(provenance, history);
    const mod = provenance?.moderation ?? null;
    const rawVariables = provenance?.ingest.rawVariables ?? null;

    return (
        <div className="border border-warning-subtle rounded p-3 mt-3">
            <h2 className="h6">Moderator view</h2>

            {!provenance && (
                <p className="text-muted small mb-0">
                    Full provenance unavailable (endpoint missing or errored) —
                    showing public history only.
                </p>
            )}

            {mod && (
                <dl className="row small mb-3">
                    <dt className="col-sm-3">Mod note</dt>
                    <dd className="col-sm-9">{mod.modNote ?? '—'}</dd>

                    <dt className="col-sm-3">Ineligible reason</dt>
                    <dd className="col-sm-9">{mod.ineligibleReason ?? '—'}</dd>

                    <dt className="col-sm-3">Excluded</dt>
                    <dd className="col-sm-9">{mod.excluded ? 'Yes' : 'No'}</dd>

                    <dt className="col-sm-3">Verify queue hidden</dt>
                    <dd className="col-sm-9">
                        {mod.verifyQueueHidden ? 'Yes' : 'No'}
                    </dd>

                    {rawVariables && (
                        <>
                            <dt className="col-sm-3">Raw variables</dt>
                            <dd className="col-sm-9">
                                <code>{JSON.stringify(rawVariables)}</code>
                            </dd>
                        </>
                    )}
                </dl>
            )}

            {timeline.length > 0 && (
                <ul className="list-unstyled mb-0">
                    {timeline.map((item, i) => (
                        <li
                            key={`${item.kind}-${item.at}-${i}`}
                            className={
                                item.struck
                                    ? 'border-start ps-3 pb-3 position-relative text-decoration-line-through text-muted'
                                    : 'border-start ps-3 pb-3 position-relative'
                            }
                        >
                            <div className="fw-semibold small">
                                {item.label}
                                {item.struck ? ' (undone)' : ''}
                            </div>
                            <div className="text-muted small">
                                {formatAt(item.at)}
                            </div>
                            {item.sub && (
                                <div className="small fst-italic">
                                    {item.sub}
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
