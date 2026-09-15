import type { StripTab } from '../../../../../types/runner-profile.types';
import type { StripTile } from '../stat-strip';

export const STRIP_MAX = 5;

export interface CatalogTile<D> {
    id: string;
    /** The picker's name for the tile. */
    name: string;
    /** Null when there is nothing to show. `shown` = ids on the strip. */
    build: (data: D, shown: ReadonlySet<string>) => StripTile | null;
}

export interface StripCatalog<D> {
    tab: StripTab;
    tiles: CatalogTile<D>[];
    /** Today's strip for this data, used when the runner picked nothing. */
    defaults: (data: D) => string[];
}

export interface StripOption {
    id: string;
    name: string;
    /** The tile's current value, or null when it has no data. */
    preview: string | null;
}

export interface ResolvedStrip {
    tab: StripTab;
    tiles: StripTile[];
    options: StripOption[];
    /** The ids the strip is showing, in order. */
    picked: string[];
}

export function resolveStrip<D>(
    catalog: StripCatalog<D>,
    data: D,
    saved: string[] | null | undefined,
): ResolvedStrip {
    const byId = new Map(catalog.tiles.map((t) => [t.id, t]));
    const picked = (saved ?? catalog.defaults(data))
        .filter((id) => byId.has(id))
        .slice(0, STRIP_MAX);
    const shown = new Set(picked);
    const tiles = picked
        .map((id) => byId.get(id)?.build(data, shown) ?? null)
        .filter((t): t is StripTile => t !== null);
    const options = catalog.tiles.map((t) => {
        const tile = t.build(data, new Set([t.id]));
        return { id: t.id, name: t.name, preview: tile?.value ?? null };
    });
    return { tab: catalog.tab, tiles, options, picked };
}
