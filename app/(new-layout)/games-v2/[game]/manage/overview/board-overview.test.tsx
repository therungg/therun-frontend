// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { SrcImportJob } from '../../../../../../types/src-import.types';
import type { NavGroup } from '../console/nav-model';
import { BoardOverview } from './board-overview';

const job = (over: Partial<SrcImportJob>): SrcImportJob => ({
    id: 7,
    gameId: 12,
    srcGameId: 'x',
    srcGameAbbreviation: 'sm64',
    srcGameName: 'Super Mario 64',
    srcUrl: 'https://www.speedrun.com/sm64',
    requestedBy: 1,
    status: 'running',
    phase: 'meta',
    checkpoint: null,
    categoriesCount: 0,
    levelsCount: 0,
    variablesCount: 0,
    runsCount: 0,
    playersCount: 0,
    playersMatchedCount: 0,
    requestsMade: 0,
    estimatedRequests: null,
    error: null,
    startedAt: null,
    finishedAt: null,
    createdAt: '2026-09-03T10:00:00Z',
    commitStatus: null,
    commitPhase: null,
    importedRunsCount: 0,
    importSkippedCount: 0,
    configAppliedAt: null,
    runsImportedAt: null,
    srcOnlyLeaderboard: false,
    kind: 'settings',
    changeSummary: null,
    commitFlags: null,
    ...over,
});

/** The card under test never calls these; they only satisfy the props. */
const noop = () => undefined;

const navGroups: NavGroup[] = [
    { id: 'game', label: 'Game', items: [{ id: 'import', label: 'Import' }] },
];

function renderOverview(syncJob: SrcImportJob | null) {
    return render(
        <BoardOverview
            game={{ id: 12, name: 'sm64', display: 'Super Mario 64' }}
            rows={[]}
            groups={[]}
            attentionItems={[]}
            moderators={[]}
            pendingApplications={0}
            syncJob={syncJob}
            navGroups={navGroups}
            canModerate
            onNavigate={noop}
            onEditCategory={noop}
        />,
    );
}

describe('BoardOverview — import card', () => {
    afterEach(cleanup);

    it('keeps saying an import is running while a resync is mid-chain', () => {
        // 'applied' is terminal for a settings job but not for a resync — the
        // import-runs and prune steps are still ahead of it.
        renderOverview(
            job({ kind: 'resync', status: 'done', commitStatus: 'applied' }),
        );
        expect(screen.getByText('An import is running.')).toBeTruthy();
    });

    it('stops saying so once the resync has pruned', () => {
        renderOverview(
            job({ kind: 'resync', status: 'done', commitStatus: 'pruned' }),
        );
        expect(screen.queryByText('An import is running.')).toBeNull();
    });

    it('offers the link card when the board has no import at all', () => {
        renderOverview(null);
        expect(
            screen.getByRole('button', { name: 'Link and import' }),
        ).toBeTruthy();
    });
});
