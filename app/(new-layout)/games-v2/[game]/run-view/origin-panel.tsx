import Link from '~src/components/link';
import { originSummary } from '~src/lib/run-view/origin-summary';
import { safeEncodeURI } from '~src/utils/uri';
import type { RunViewModel } from './run-view';

export function OriginPanel({ model }: { model: RunViewModel }) {
    const summary = originSummary(model.origin, model.runnerName);
    if (!summary) return null;

    const ingestedAt = model.origin?.ingestedAt ?? null;
    const showSplitsLink =
        summary.showSplitsLink && model.userId != null && !model.isGuest;
    const pendingSelfClaim =
        model.origin?.path === 'manual_self' &&
        model.verificationStatus === 'pending';

    return (
        <div className="border rounded p-3">
            <div className="d-flex flex-wrap align-items-center gap-2">
                <span>{summary.line}</span>
                {pendingSelfClaim && (
                    <span className="badge text-bg-warning">
                        Self-reported · unverified
                    </span>
                )}
            </div>
            <div className="text-muted small mt-1">
                {ingestedAt
                    ? `Ingested ${new Date(ingestedAt).toLocaleDateString()}`
                    : 'Ingest date unknown'}
            </div>
            {showSplitsLink && (
                <div className="mt-2">
                    <Link
                        href={`/${safeEncodeURI(
                            model.runnerName,
                        )}/${safeEncodeURI(model.game.display)}`}
                    >
                        View splits & attempt stats
                    </Link>
                </div>
            )}
        </div>
    );
}
