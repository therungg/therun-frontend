'use client';

import { type StripTile, TileList } from '../stat-strip-tiles';
import type { ResolvedStrip } from './resolve';
import { useStripDraft } from './strip-draft-store';

/** The strip's tiles: the saved ones, or the picker's unsaved picks while it is open. */
export function LiveTiles({ strip }: { strip: ResolvedStrip }) {
    const draft = useStripDraft(strip.tab);
    if (!draft) return <TileList tiles={strip.tiles} />;
    const byId = new Map(strip.options.map((o) => [o.id, o]));
    const tiles = draft
        .map((id) => {
            const option = byId.get(id);
            if (!option) return null;
            return option.pairedWith && draft.includes(option.pairedWith)
                ? (option.pairedTile ?? null)
                : option.tile;
        })
        .filter((t): t is StripTile => t !== null);
    return <TileList tiles={tiles} />;
}
