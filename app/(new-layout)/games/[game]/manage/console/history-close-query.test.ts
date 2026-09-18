import { describe, expect, it } from 'vitest';
import { historyCloseQuery } from './history-close-query';

describe('historyCloseQuery', () => {
    it('restores the underlying pane when activeItem is non-null', () => {
        expect(historyCloseQuery('pane=history', 'attention')).toBe(
            'pane=attention',
        );
    });

    it('preserves other params while restoring the pane', () => {
        expect(historyCloseQuery('pane=history&kind=report', 'attention')).toBe(
            'pane=attention&kind=report',
        );
    });

    it('removes pane but keeps other params when activeItem is null', () => {
        expect(historyCloseQuery('pane=history&kind=report', null)).toBe(
            'kind=report',
        );
    });

    it('returns null (bare path) when pane was the only param and activeItem is null', () => {
        expect(historyCloseQuery('pane=history', null)).toBeNull();
    });

    it('leaves the query untouched when the URL has no pane=history at all', () => {
        expect(historyCloseQuery('pane=attention&kind=report', null)).toBe(
            'pane=attention&kind=report',
        );
        expect(historyCloseQuery('pane=attention', 'attention')).toBe(
            'pane=attention',
        );
        expect(historyCloseQuery('', null)).toBeNull();
    });
});
