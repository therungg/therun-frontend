'use client';
import React from 'react';
import ContentLoader from 'react-content-loader';
// TODO: Remove all of the PropsFrom uses for the native React.ComponentProps
import { PropsFrom } from '../../../../types/utility.types';
import styles from './skeleton.module.scss';

// Mirrors .games-grid: tile-shaped placeholders at the same 3:4 art ratio,
// so the loading state doesn't reflow the page once real tiles land.
const COLUMNS = 6;
const ROWS = 4;
const TILE_WIDTH = 148;
const GAP = 16;
const ART_HEIGHT = Math.round((TILE_WIDTH * 4) / 3);
const META_HEIGHT = 30;
const ROW_HEIGHT = ART_HEIGHT + META_HEIGHT + GAP;

const VIEW_WIDTH = COLUMNS * TILE_WIDTH + (COLUMNS - 1) * GAP;
const VIEW_HEIGHT = ROWS * ROW_HEIGHT - GAP;

const tiles = Array.from({ length: COLUMNS * ROWS }, (_, i) => {
    const col = i % COLUMNS;
    const row = Math.floor(i / COLUMNS);
    const x = col * (TILE_WIDTH + GAP);
    const y = row * ROW_HEIGHT;

    return { key: `${col}-${row}`, x, y };
});

export const SkeletonGamesList = (props: PropsFrom<typeof ContentLoader>) => {
    return (
        <ContentLoader
            uniqueKey="skeleton-games-list"
            id="skeleton-games-list"
            className={styles.gamesGrid}
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            speed={2}
            title="Loading games list"
            backgroundColor="var(--bs-secondary-bg)"
            foregroundColor="var(--bs-body-bg)"
            {...props}
        >
            {tiles.map(({ key, x, y }) => (
                <React.Fragment key={key}>
                    <rect
                        x={x}
                        y={y}
                        width={TILE_WIDTH}
                        height={ART_HEIGHT}
                        rx="10"
                    />
                    <rect
                        x={x}
                        y={y + ART_HEIGHT + 8}
                        width={TILE_WIDTH * 0.8}
                        height={12}
                    />
                </React.Fragment>
            ))}
        </ContentLoader>
    );
};
