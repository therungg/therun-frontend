'use client';

import { UserLink } from '~src/components/links/links';
import type {
    ResolvedGame,
    RunDetail,
} from '../../../../../../../types/leaderboards.types';
import type {
    HistoryEvent,
    RunProvenance,
} from '../../../../../../../types/moderation.types';
import { ModProvenancePanel } from '../../../run-view/mod-provenance-panel';
import { BackLink } from '../../../shared/back-link';
import { RunPageMount } from '../../moderation/moderate/run-page-mount';
import type {
    SheetBoard,
    SheetContext,
} from '../../moderation/moderate/subject';

interface Props {
    game: ResolvedGame;
    run: RunDetail;
    /** The run's place on its board; 0 when it is not the runner's entry. */
    rank: number;
    provenance: RunProvenance | null;
    history: HistoryEvent[];
    /** Null when the run's board doesn't resolve. */
    panel: { context: SheetContext; board: SheetBoard } | null;
}

export function ManageRunPage({
    game,
    run,
    rank,
    provenance,
    history,
    panel,
}: Props) {
    return (
        <div>
            <header className="d-flex align-items-center gap-3 mb-3">
                {game.image && (
                    <img
                        src={game.image}
                        alt={game.display}
                        width={48}
                        height={64}
                        className="rounded"
                        style={{ aspectRatio: '3 / 4' }}
                        loading="eager"
                    />
                )}
                <div>
                    <small className="text-muted d-block">Manage run</small>
                    <h1 className="mb-0">{game.display}</h1>
                </div>
                <div className="ms-auto">
                    <BackLink
                        href={`/games-v2/${encodeURIComponent(game.name)}`}
                        label="Back to leaderboard"
                    />
                </div>
            </header>

            <div className="mb-3">
                <div className="d-flex align-items-center gap-2">
                    {run.isGuest ? (
                        <>
                            <strong>{run.runnerName}</strong>
                            <span className="badge text-bg-secondary">
                                guest
                            </span>
                        </>
                    ) : (
                        <UserLink
                            username={run.runnerName}
                            url={undefined}
                            to="leaderboards"
                        />
                    )}
                </div>
                <small className="text-muted">
                    {run.categoryDisplay}
                    {run.subcategoryKey
                        ? ` · ${run.subcategoryKey.replace(/\|/g, ' · ')}`
                        : ''}
                </small>
            </div>

            {panel ? (
                <RunPageMount
                    run={run}
                    rank={rank}
                    provenance={provenance}
                    context={panel.context}
                    board={panel.board}
                />
            ) : null}

            <div className="mb-3">
                <ModProvenancePanel
                    provenance={provenance}
                    history={history}
                    gameSlug={game.name}
                    runId={run.runId}
                    showConsoleLink={false}
                />
            </div>
        </div>
    );
}
