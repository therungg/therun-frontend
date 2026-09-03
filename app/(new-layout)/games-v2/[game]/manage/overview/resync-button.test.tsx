// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ResyncButton } from './resync-button';

const resyncAction = vi.fn(async (..._args: unknown[]) => ({
    result: { jobId: 1 },
}));
vi.mock('../src-import/src-import-actions', () => ({
    resyncAction: (...a: unknown[]) => resyncAction(...a),
}));

describe('ResyncButton', () => {
    it('posts its kind and label', async () => {
        const onStarted = vi.fn();
        render(
            <ResyncButton
                gameId={1}
                gameSlug="hk"
                kind="settings"
                label="Import settings"
                lastJobCreatedAt={null}
                running={false}
                onStarted={onStarted}
            />,
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'Import settings' }),
        );
        await waitFor(() =>
            expect(resyncAction).toHaveBeenCalledWith({
                gameId: 1,
                gameSlug: 'hk',
                kind: 'settings',
            }),
        );
        expect(onStarted).toHaveBeenCalled();
    });
    it('disables on the daily gate unless bypassed', () => {
        const justNow = new Date().toISOString();
        const { rerender } = render(
            <ResyncButton
                gameId={1}
                gameSlug="hk"
                kind="resync"
                label="Import runs"
                lastJobCreatedAt={justNow}
                running={false}
                onStarted={vi.fn()}
            />,
        );
        expect(screen.getByRole('button')).toBeDisabled();
        rerender(
            <ResyncButton
                gameId={1}
                gameSlug="hk"
                kind="resync"
                label="Import runs"
                lastJobCreatedAt={justNow}
                running={false}
                bypassCooldown
                onStarted={vi.fn()}
            />,
        );
        expect(screen.getByRole('button')).toBeEnabled();
    });
});
