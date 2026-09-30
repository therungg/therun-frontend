// @vitest-environment jsdom
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SrcMatchRow } from '../../../../../../types/src-matches.types';
import { MatchRunnersPane } from './match-runners-pane';

const mocks = vi.hoisted(() => ({
    load: vi.fn(),
    link: vi.fn(),
    refresh: vi.fn(),
}));

vi.mock('./actions/src-matches.action', () => ({
    loadSrcMatchesAction: mocks.load,
    linkSrcMatchesAction: mocks.link,
}));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ refresh: mocks.refresh }),
}));
vi.mock('~src/components/link', () => ({
    default: ({
        children,
        href,
        className,
    }: {
        children: React.ReactNode;
        href: string;
        className?: string;
    }) => (
        <a href={href} className={className}>
            {children}
        </a>
    ),
}));

const row = (
    userId: number,
    username: string,
    queued: number,
    state: SrcMatchRow['state'],
    suggestions: SrcMatchRow['suggestions'] = [],
): SrcMatchRow => ({ userId, username, queued, state, suggestions, pbs: [] });

const sug = (srcName: string, clears: number) => ({
    srcUserId: `id-${srcName}`,
    srcName,
    clears,
    alsoMatches: 0,
    origin: 'guest-merge' as const,
    boards: 0,
});

const ROWS: SrcMatchRow[] = [
    row(1, 'small', 2, 'none'),
    row(2, 'big', 190, 'none'),
    row(3, 'mid', 37, 'none'),
    row(4, 'sure-one', 5, 'sure', [sug('SureOne', 5)]),
];

beforeEach(() => {
    mocks.load.mockResolvedValue({ list: { imported: true, rows: ROWS } });
    mocks.link.mockReset();
});

afterEach(cleanup);

const runnerOrder = () =>
    screen
        .getAllByRole('row')
        .slice(1)
        .map((tr) => tr.querySelector('a')?.textContent);

describe('MatchRunnersPane', () => {
    it('orders each state group by queued runs, keeping the groups', async () => {
        render(<MatchRunnersPane gameSlug="g" framed />);
        await screen.findByText('big');
        expect(runnerOrder()).toEqual(['big', 'mid', 'small', 'sure-one']);
    });

    it('shows the header box as partly ticked when only some rows are', async () => {
        render(<MatchRunnersPane gameSlug="g" />);
        const head = (await screen.findByLabelText(
            'Tick every runner that can be linked',
        )) as HTMLInputElement;
        expect(head.checked).toBe(false);
        expect(head.indeterminate).toBe(true);
    });

    it('reviews before linking, then links exactly the ticked rows', async () => {
        mocks.link.mockResolvedValue({
            results: [
                {
                    userId: 4,
                    ok: true,
                    srcUsername: 'SureOne',
                    claimedRuns: 0,
                    mergedRuns: 5,
                    syncQueued: false,
                },
                {
                    userId: 2,
                    ok: true,
                    srcUsername: 'BigOne',
                    claimedRuns: 0,
                    mergedRuns: 0,
                    syncQueued: false,
                },
            ],
        });
        render(<MatchRunnersPane gameSlug="g" />);
        fireEvent.change(
            await screen.findByLabelText('speedrun.com name for big'),
            { target: { value: 'https://www.speedrun.com/users/BigOne' } },
        );

        fireEvent.click(
            screen.getByRole('button', { name: 'Review and link' }),
        );
        expect(mocks.link).not.toHaveBeenCalled();
        expect(screen.getByText('typed, checked on link')).toBeTruthy();

        await act(async () => {
            fireEvent.click(
                screen.getByRole('button', { name: 'Link 2 runners' }),
            );
        });
        await waitFor(() => expect(mocks.link).toHaveBeenCalledTimes(1));
        expect(mocks.link).toHaveBeenCalledWith('g', [
            { userId: 2, srcName: 'BigOne' },
            { userId: 4, srcUserId: 'id-SureOne' },
        ]);
    });

    it('filters to one state', async () => {
        mocks.load.mockResolvedValue({
            list: {
                imported: true,
                rows: [
                    ...ROWS,
                    row(5, 'fought', 9, 'contested', [
                        sug('A', 1),
                        sug('B', 2),
                    ]),
                ],
            },
        });
        render(<MatchRunnersPane gameSlug="g" />);
        fireEvent.click(
            await screen.findByRole('button', { name: /Contested/ }),
        );
        expect(runnerOrder()).toEqual(['fought']);
    });

    it('says every runner is matched when none are left', async () => {
        mocks.load.mockResolvedValue({ list: { imported: true, rows: [] } });
        render(<MatchRunnersPane gameSlug="g" />);
        expect(await screen.findByText('Every runner is matched')).toBeTruthy();
    });
});
