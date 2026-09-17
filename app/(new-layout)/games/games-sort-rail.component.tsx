'use client';
import React from 'react';
import { GameSort } from '~app/(new-layout)/games/games.types';

const SORTS: { key: GameSort; label: string }[] = [
    { key: 'trending', label: 'Trending' },
    { key: 'runners', label: 'Runners' },
    { key: 'pbs', label: 'PBs' },
    { key: 'playtime', label: 'Playtime' },
];

interface GamesSortRailProps {
    value: GameSort;
    onChange: (sort: GameSort) => void;
}

export const GamesSortRail: React.FunctionComponent<GamesSortRailProps> = ({
    value,
    onChange,
}) => (
    <div className="games-sort-rail">
        {SORTS.map((s) => (
            <button
                key={s.key}
                type="button"
                className="games-sort-pill"
                aria-pressed={value === s.key}
                onClick={() => onChange(s.key)}
            >
                {s.label}
            </button>
        ))}
    </div>
);
