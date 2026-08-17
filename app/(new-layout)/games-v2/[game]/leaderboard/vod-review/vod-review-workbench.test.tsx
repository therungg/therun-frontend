// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { VodPlayer } from './player/types';
import { VodReviewWorkbench } from './vod-review-workbench';

const mocks = vi.hoisted(() => ({ saveVodReviewAction: vi.fn() }));
vi.mock('../actions/vod-review.action', () => ({
    saveVodReviewAction: mocks.saveVodReviewAction,
}));

function fake(): VodPlayer & { time: number } {
    const p = {
        time: 0,
        ready: Promise.resolve(),
        supportsRate: true,
        seek: vi.fn((s: number) => {
            p.time = s;
        }),
        play: vi.fn(),
        pause: vi.fn(),
        getTime: () => p.time,
        setRate: vi.fn(),
        duration: () => 1000,
        destroy: vi.fn(),
    };
    return p;
}
const base = {
    url: 'https://youtu.be/dQw4w9WgXcQ',
    gameSlug: 'g',
    target: { kind: 'run' as const, runId: 1 },
};

describe('VodReviewWorkbench (mod)', () => {
    it('sets start and end from the player clock and shows the retime against the submitted time', async () => {
        const player = fake();
        render(
            <VodReviewWorkbench
                mode="mod"
                {...base}
                playerFactory={() => player}
                initial={{
                    fps: 60,
                    markers: [],
                    realTimeMs: 100050,
                    timing: 'realtime',
                }}
            />,
        );
        await waitFor(() =>
            expect(
                screen.getByRole('button', { name: /set start/i }),
            ).toBeEnabled(),
        );
        player.time = 10;
        fireEvent.click(screen.getByRole('button', { name: /set start/i }));
        player.time = 110;
        fireEvent.click(screen.getByRole('button', { name: /set end/i }));
        expect(screen.getByText(/retimed 1:40\.000/)).toBeInTheDocument();
        expect(screen.getByText(/−0\.050/)).toBeInTheDocument();
    });
    it('saves markers with the chosen fps and computed retime', async () => {
        const player = fake();
        mocks.saveVodReviewAction.mockResolvedValue({ ok: true });
        render(
            <VodReviewWorkbench
                mode="mod"
                {...base}
                playerFactory={() => player}
                initial={{
                    fps: 60,
                    markers: [
                        { kind: 'start', frame: 0 },
                        { kind: 'end', frame: 60 },
                    ],
                    realTimeMs: 1000,
                    timing: 'realtime',
                }}
            />,
        );
        await waitFor(() =>
            expect(
                screen.getByRole('button', { name: /save markers/i }),
            ).toBeEnabled(),
        );
        fireEvent.click(screen.getByRole('button', { name: /save markers/i }));
        await waitFor(() =>
            expect(mocks.saveVodReviewAction).toHaveBeenCalledWith(
                'g',
                base.target,
                {
                    fps: 60,
                    markers: [
                        { kind: 'start', frame: 0 },
                        { kind: 'end', frame: 60 },
                    ],
                    retimedMs: 1000,
                },
                {},
            ),
        );
    });
    it('disables Apply retime when the set time is game time', async () => {
        render(
            <VodReviewWorkbench
                mode="mod"
                {...base}
                target={{ kind: 'manual', manualTimeId: 2, gameId: 1 }}
                playerFactory={() => fake()}
                initial={{
                    fps: 60,
                    markers: [
                        { kind: 'start', frame: 0 },
                        { kind: 'end', frame: 60 },
                    ],
                    realTimeMs: null,
                    timing: 'gametime',
                }}
            />,
        );
        await waitFor(() =>
            expect(
                screen.getByRole('button', { name: /apply retime/i }),
            ).toBeDisabled(),
        );
    });
});

describe('VodReviewWorkbench (runner)', () => {
    it('reports start/end to the form and hides mod-only controls', async () => {
        const player = fake();
        const onChange = vi.fn();
        render(
            <VodReviewWorkbench
                mode="runner"
                url={base.url}
                playerFactory={() => player}
                onChange={onChange}
                initial={{
                    fps: 60,
                    markers: [],
                    realTimeMs: null,
                    timing: 'realtime',
                }}
            />,
        );
        await waitFor(() =>
            expect(
                screen.getByRole('button', { name: /set start/i }),
            ).toBeEnabled(),
        );
        expect(screen.queryByRole('button', { name: /add note/i })).toBeNull();
        expect(
            screen.queryByRole('button', { name: /save markers/i }),
        ).toBeNull();
        player.time = 2;
        fireEvent.click(screen.getByRole('button', { name: /set start/i }));
        expect(onChange).toHaveBeenLastCalledWith({
            fps: 60,
            markers: [{ kind: 'start', frame: 120 }],
        });
    });
});
