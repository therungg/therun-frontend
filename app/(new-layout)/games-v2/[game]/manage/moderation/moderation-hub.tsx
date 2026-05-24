'use client';

import { useRouter } from 'next/navigation';
import Link from '~src/components/link';

interface Props {
    gameSlug: string;
    gameDisplay: string;
    categories: Array<{ id: number; display: string }>;
    counts: {
        queue: number | null;
        reports: number | null;
        pendingClaims: number | null;
    };
}

function CountBadge({ n }: { n: number | null }) {
    if (!n || n <= 0) return null;
    return (
        <span className="badge rounded-pill text-bg-danger">
            {n > 99 ? '99+' : n}
        </span>
    );
}

export function ModerationHub({
    gameSlug,
    gameDisplay,
    categories,
    counts,
}: Props) {
    const router = useRouter();
    const baseHref = `/games-v2/${gameSlug}/manage/moderation`;

    return (
        <div className="container py-3">
            <div className="d-flex align-items-center justify-content-between mb-3">
                <h1 className="h4 mb-0">Moderation — {gameDisplay}</h1>
                <Link
                    href={`/games-v2/${gameSlug}`}
                    className="btn btn-sm btn-outline-secondary"
                >
                    Back to leaderboards
                </Link>
            </div>

            <div className="row g-3 mb-4">
                <div className="col-md-4">
                    <Link
                        href={`${baseHref}/queue`}
                        className="card h-100 text-decoration-none text-reset"
                    >
                        <div className="card-body">
                            <h2 className="h6 d-flex justify-content-between align-items-center gap-2">
                                Triage queue <CountBadge n={counts.queue} />
                            </h2>
                            <p className="text-muted small mb-0">
                                Flagged runs needing review — impossible times,
                                missing VOD, reports, and pending self-claims.
                            </p>
                        </div>
                    </Link>
                </div>
                <div className="col-md-4">
                    <Link
                        href={`${baseHref}/reports`}
                        className="card h-100 text-decoration-none text-reset"
                    >
                        <div className="card-body">
                            <h2 className="h6 d-flex justify-content-between align-items-center gap-2">
                                Reports <CountBadge n={counts.reports} />
                            </h2>
                            <p className="text-muted small mb-0">
                                User-submitted reports of suspicious runs
                                awaiting review.
                            </p>
                        </div>
                    </Link>
                </div>
                <div className="col-md-4">
                    <Link
                        href={`${baseHref}/manual-times`}
                        className="card h-100 text-decoration-none text-reset"
                    >
                        <div className="card-body">
                            <h2 className="h6 d-flex justify-content-between align-items-center gap-2">
                                Manual times{' '}
                                <CountBadge n={counts.pendingClaims} />
                            </h2>
                            <p className="text-muted small mb-0">
                                Mod- and self-asserted leaderboard times; verify
                                or reject pending self-claims.
                            </p>
                        </div>
                    </Link>
                </div>
                <div className="col-md-4">
                    <Link
                        href={`${baseHref}/rules`}
                        className="card h-100 text-decoration-none text-reset"
                    >
                        <div className="card-body">
                            <h2 className="h6">Exclusion rules</h2>
                            <p className="text-muted small mb-0">
                                View and remove standing user-exclusion rules
                                for this game.
                            </p>
                        </div>
                    </Link>
                </div>
                <div className="col-md-4">
                    <Link
                        href={`${baseHref}/policies`}
                        className="card h-100 text-decoration-none text-reset"
                    >
                        <div className="card-body">
                            <h2 className="h6">Board policies</h2>
                            <p className="text-muted small mb-0">
                                Minimum/maximum times, video requirements, and
                                auto-flag thresholds.
                            </p>
                        </div>
                    </Link>
                </div>
                <div className="col-md-4">
                    <Link
                        href={`${baseHref}/log`}
                        className="card h-100 text-decoration-none text-reset"
                    >
                        <div className="card-body">
                            <h2 className="h6">Mod action log</h2>
                            <p className="text-muted small mb-0">
                                Recent moderation actions, with undo for fresh
                                entries.
                            </p>
                        </div>
                    </Link>
                </div>
            </div>

            <div className="border rounded p-3">
                <h2 className="h6">Category roster</h2>
                <p className="text-muted small">
                    Pick a category to review its leaderboard roster and exclude
                    or include runs in bulk.
                </p>
                <label
                    htmlFor="moderation-category"
                    className="form-label small text-muted mb-1"
                >
                    Category
                </label>
                <select
                    id="moderation-category"
                    className="form-select form-select-sm"
                    style={{ maxWidth: 420 }}
                    defaultValue=""
                    onChange={(e) => {
                        const id = e.target.value;
                        if (id) {
                            router.push(`${baseHref}/roster?categoryId=${id}`);
                        }
                    }}
                >
                    <option value="" disabled>
                        Select a category…
                    </option>
                    {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.display}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}
