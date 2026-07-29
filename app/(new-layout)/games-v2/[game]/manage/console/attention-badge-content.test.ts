import { describe, expect, it } from 'vitest';
import { attentionBadgeContent } from './attention-badge-content';

describe('attentionBadgeContent', () => {
    it('renders nothing for a confirmed zero', () => {
        expect(attentionBadgeContent(0, false)).toBeNull();
    });

    it('renders the plain count when all sources loaded', () => {
        const badge = attentionBadgeContent(7, false);
        expect(badge?.text).toBe('7');
        expect(badge?.label).toBe('7 items need attention');
        expect(badge?.title).toBeUndefined();
    });

    it('caps the displayed count at 99+', () => {
        expect(attentionBadgeContent(100, false)?.text).toBe('99+');
    });

    it('marks a degraded count as a floor with a trailing +', () => {
        const badge = attentionBadgeContent(7, true);
        expect(badge?.text).toBe('7+');
        expect(badge?.label).toContain('actual count may be higher');
        expect(badge?.title).toBe(
            'Some sources failed to load — counts may be incomplete',
        );
    });

    it('shows a bare ! when everything failed and the count is zero', () => {
        const badge = attentionBadgeContent(0, true);
        expect(badge?.text).toBe('!');
        expect(badge?.label).toBe(
            'Some sources failed to load — counts may be incomplete',
        );
    });

    it('does not double up the + when a degraded count is also over the cap', () => {
        expect(attentionBadgeContent(100, true)?.text).toBe('99+');
    });
});
