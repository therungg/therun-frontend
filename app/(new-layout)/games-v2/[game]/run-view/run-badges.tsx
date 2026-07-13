// Shared, server-safe badge/line renderers used by both the public run view
// (run-view.tsx) and the mod action card (manage/run/[runId]/run-card.tsx).
// Kept prop-plain (no RunDetail/RunViewModel dependency) so either side can
// import without pulling in the other's types.

export function VerificationBadge({
    status,
}: {
    status: 'pending' | 'verified' | 'rejected';
}) {
    if (status === 'verified') {
        return (
            <span className="badge text-bg-success" aria-label="verified">
                ✓ Verified
            </span>
        );
    }
    if (status === 'pending') {
        return (
            <span className="badge text-bg-warning" aria-label="pending">
                ⌛ Pending
            </span>
        );
    }
    return (
        <span
            className="badge text-bg-secondary opacity-75"
            aria-label="rejected"
        >
            Rejected
        </span>
    );
}

export function VariablesLine({
    variables,
}: {
    variables: Record<string, string>;
}) {
    const entries = Object.entries(variables);
    if (entries.length === 0) return null;
    const text = entries.map(([k, v]) => `${k}=${v}`).join(', ');
    return (
        <div
            className="text-muted small text-truncate"
            title={text}
            style={{ maxWidth: '100%' }}
        >
            {text}
        </div>
    );
}
