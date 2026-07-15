'use client';

import type { StepProps } from '../types';

export function StepWelcome({ data, onAdvance }: StepProps) {
    const empty = data.categories.length === 0;
    return (
        <section>
            <h2 className="h4">Welcome, moderator</h2>
            {empty ? (
                <p>
                    No runs have been ingested for this board yet — you’ll be
                    setting it up from scratch. Categories appear automatically
                    as runs are submitted or ingested from timers.
                </p>
            ) : (
                <>
                    <p>
                        Your board already exists — runners have been racing on
                        it. Your job is to curate it, not build it from nothing.
                    </p>
                    <div className="d-flex gap-3 flex-wrap my-3">
                        <StatTile
                            value={data.categories.length}
                            label="categories discovered"
                        />
                        <StatTile
                            value={data.stats.uniqueRunners}
                            label="unique runners"
                        />
                        <StatTile
                            value={data.stats.totalFinishedAttemptCount}
                            label="finished runs"
                        />
                    </div>
                </>
            )}
            <p className="mb-1">The next steps walk you through:</p>
            <ol>
                <li>Game details — cover, platforms, links</li>
                <li>
                    Pick your main categories — choose what shows on the board
                </li>
                <li>
                    Configure each main category — timing, rules, variables,
                    standards
                </li>
                <li>
                    Settings for all categories — bulk defaults and game-wide
                    variables
                </li>
                <li>Mod team — invite co-moderators, then go live</li>
            </ol>
            <p className="text-muted small">
                These numbers come from runs auto-ingested from timers like
                LiveSplit — nothing was submitted manually.
            </p>
            <button
                type="button"
                className="btn btn-primary"
                onClick={onAdvance}
            >
                Let’s set it up
            </button>
        </section>
    );
}

function StatTile({ value, label }: { value: number; label: string }) {
    return (
        <div
            className="border rounded p-3 text-center"
            style={{ minWidth: '9rem' }}
        >
            <div className="h3 mb-0">{value.toLocaleString()}</div>
            <small className="text-muted">{label}</small>
        </div>
    );
}
