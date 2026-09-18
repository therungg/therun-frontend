'use client';
import React from 'react';
import ContentLoader from 'react-content-loader';
// TODO: Remove all of the PropsFrom uses for the native React.ComponentProps
import { PropsFrom } from '../../../../types/utility.types';

// Real grid items inside the actual `.games-grid` rule (app/(new-layout)
// /games/_games.scss: repeat(auto-fill, minmax(148px, 1fr)), same gap), and
// `.game-tile`/`.game-tile-art` for sizing -- rather than a single SVG with
// a hand-computed column count and gap. That way the placeholder always has
// the same column count and gap the real tiles will land in, at any
// viewport, instead of only matching one hardcoded width.
const TILE_COUNT = 24;

export const SkeletonGamesList = (props: PropsFrom<typeof ContentLoader>) => {
    return (
        <div
            className="games-grid"
            role="status"
            aria-label="Loading games list"
        >
            {Array.from({ length: TILE_COUNT }, (_, i) => (
                <div className="game-tile" key={i} aria-hidden="true">
                    <div className="game-tile-art">
                        <ContentLoader
                            uniqueKey={`skeleton-games-list-art-${i}`}
                            viewBox="0 0 100 100"
                            preserveAspectRatio="none"
                            style={{ width: '100%', height: '100%' }}
                            speed={2}
                            backgroundColor="var(--bs-secondary-bg)"
                            foregroundColor="var(--bs-body-bg)"
                            {...props}
                        >
                            <rect x="0" y="0" width="100" height="100" />
                        </ContentLoader>
                    </div>
                    <div className="game-tile-meta">
                        <ContentLoader
                            uniqueKey={`skeleton-games-list-name-${i}`}
                            viewBox="0 0 100 12"
                            preserveAspectRatio="none"
                            style={{ width: '80%', height: '0.75rem' }}
                            speed={2}
                            backgroundColor="var(--bs-secondary-bg)"
                            foregroundColor="var(--bs-body-bg)"
                            {...props}
                        >
                            <rect x="0" y="0" width="100" height="12" />
                        </ContentLoader>
                    </div>
                </div>
            ))}
        </div>
    );
};
