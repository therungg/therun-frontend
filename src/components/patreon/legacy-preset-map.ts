import type { PerMode } from '../../../types/patreon.types';
import patreonStyles from './patreon-styles';

export type LegacyPresetEntry =
    | { kind: 'solid'; value: PerMode<string>; tier: number }
    | { kind: 'gradient'; value: PerMode<string[]>; tier: number };

interface RawColor {
    colorset1: string | string[];
    colorset2: string | string[];
    tier: number;
    id: number;
}

// Re-derive raw data from patreon-styles (it already builds style objects;
// we want the underlying color values). Duplicate the table here rather than
// refactor patreon-styles.ts — the old file is kept as-is for continuity.
const RAW_PRESETS: RawColor[] = [
    { colorset1: '#27A11B', colorset2: '#007c00', tier: 1, id: 0 },
    { colorset1: '#fdc544', colorset2: '#a3850e', tier: 2, id: 100 },
    { colorset1: '#ffffff', colorset2: '#000000', tier: 2, id: 101 },
    { colorset1: '#ff69b4', colorset2: '#800080', tier: 2, id: 102 },
    { colorset1: '#d3d3d3', colorset2: '#808080', tier: 2, id: 103 },
    { colorset1: '#ff0000', colorset2: '#8b0000', tier: 2, id: 104 },
    { colorset1: '#add8e6', colorset2: '#0000ff', tier: 2, id: 105 },
    { colorset1: '#9400D3', colorset2: '#800080', tier: 2, id: 106 },
    { colorset1: '#946DE3', colorset2: '#946DE3', tier: 2, id: 107 },
    {
        colorset1: ['#ff0000', '#add8e6'],
        colorset2: ['#ff0000', '#0000ff'],
        tier: 3,
        id: 200,
    },
    {
        colorset1: ['#fdc544', '#ffffff'],
        colorset2: ['#a3850e', '#000000'],
        tier: 3,
        id: 201,
    },
    {
        colorset1: ['#007c00', '#ff69b4'],
        colorset2: ['#27A11B', '#800080'],
        tier: 3,
        id: 202,
    },
    {
        colorset1: ['#ff69b4', '#d3d3d3'],
        colorset2: ['#800080', '#808080'],
        tier: 3,
        id: 203,
    },
    {
        colorset1: ['#add8e6', '#ffffff'],
        colorset2: ['#0000ff', '#000000'],
        tier: 3,
        id: 204,
    },
    {
        colorset1: ['#E40303', '#FFED00'],
        colorset2: ['#E40303', '#FFED00'],
        tier: 3,
        id: 205,
    },
    {
        colorset1: [
            '#E40303',
            '#FF8C00',
            '#FFED00',
            '#008026',
            '#24408E',
            '#732982',
        ],
        colorset2: [
            '#E40303',
            '#FF8C00',
            '#FFED00',
            '#008026',
            '#24408E',
            '#732982',
        ],
        tier: 3,
        id: 207,
    },
    {
        colorset1: ['#5BCEFA', '#F5A9B8', '#FFFFFF', '#F5A9B8', '#5BCEFA'],
        colorset2: ['#5BCEFA', '#F5A9B8', '#FFFFFF', '#F5A9B8', '#5BCEFA'],
        tier: 3,
        id: 208,
    },
    {
        colorset1: ['#FCA11E', '#FF726E', '#FF726E'],
        colorset2: ['#FCA11E', '#FF726E', '#FF726E'],
        tier: 3,
        id: 209,
    },
    {
        colorset1: ['#1ede3e', '#18adf2'],
        colorset2: ['#1ede3e', '#18adf2'],
        tier: 3,
        id: 210,
    },
    {
        colorset1: ['#DBB4FF', '#B1F4CF'],
        colorset2: ['#DBB4FF', '#B1F4CF'],
        tier: 3,
        id: 211,
    },
    {
        colorset1: ['#00B0F0', '#93E3FF', '#93E3FF', '#00B0F0'],
        colorset2: ['#00B0F0', '#93E3FF', '#93E3FF', '#00B0F0'],
        tier: 3,
        id: 212,
    },
];

const MAP: Record<number, LegacyPresetEntry> = Object.fromEntries(
    RAW_PRESETS.map((p) => {
        if (Array.isArray(p.colorset1) && Array.isArray(p.colorset2)) {
            return [
                p.id,
                {
                    kind: 'gradient',
                    value: { dark: p.colorset1, light: p.colorset2 },
                    tier: p.tier,
                } satisfies LegacyPresetEntry,
            ];
        }
        return [
            p.id,
            {
                kind: 'solid',
                value: {
                    dark: p.colorset1 as string,
                    light: p.colorset2 as string,
                },
                tier: p.tier,
            } satisfies LegacyPresetEntry,
        ];
    }),
);

export function legacyPresetMap(
    id: number | undefined | null,
): LegacyPresetEntry | null {
    if (id === undefined || id === null) return null;
    return MAP[id] ?? null;
}

/** Surface the full list for preset-shortcut rendering. */
export const LEGACY_PRESETS: ReadonlyArray<{ id: number } & LegacyPresetEntry> =
    RAW_PRESETS.map((p) => {
        const entry = legacyPresetMap(p.id)!;
        return { id: p.id, ...entry };
    });

// Reference patreonStyles once to keep the dependency explicit —
// the raw table is intentionally duplicated above, but we want build-time
// coupling so removals of patreonStyles get noticed.
void patreonStyles;
