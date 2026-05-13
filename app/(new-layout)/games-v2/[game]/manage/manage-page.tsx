'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { ResolvedCategory } from '../../../../../types/leaderboards.types';
import { IdentifiersSection } from './identifiers/identifiers-section';
import { MinimumsSection } from './minimums/minimums-section';
import { TimingSettingsSection } from './timing/timing-settings-section';
import type { ManagePageData } from './types';
import { VisibilitySection } from './visibility/visibility-section';

interface Props {
    data: ManagePageData;
}

export function ManagePage({ data }: Props) {
    const [selectedCategoryId, setSelectedCategoryId] = useState(
        data.initialCategoryId,
    );

    const selectedCategory: ResolvedCategory | null = useMemo(
        () => data.categories.find((c) => c.id === selectedCategoryId) ?? null,
        [data.categories, selectedCategoryId],
    );

    return (
        <div>
            <header className="d-flex align-items-center gap-3 mb-3">
                {data.game.image && (
                    <img
                        src={data.game.image}
                        alt={data.game.display}
                        width={48}
                        height={64}
                        className="rounded"
                        style={{ aspectRatio: '3 / 4' }}
                        loading="eager"
                    />
                )}
                <div>
                    <small className="text-muted d-block">Management</small>
                    <h1 className="mb-0">{data.game.display}</h1>
                </div>
                <div className="ms-auto d-flex gap-2">
                    <Link
                        href={`/games-v2/${data.game.name}/manage/categories`}
                        className="btn btn-sm btn-outline-secondary"
                    >
                        Quick-manage categories
                    </Link>
                    <Link
                        href={`/games-v2/${data.game.name}`}
                        className="btn btn-sm btn-outline-secondary"
                    >
                        ← Back to leaderboards
                    </Link>
                </div>
            </header>

            <IdentifiersSection
                gameSlug={data.game.name}
                gameId={data.game.id}
                initialSlug={data.initialSlug}
                initialAbbreviation={data.initialAbbreviation}
            />

            {data.categories.length === 0 ? (
                <p className="text-center text-muted my-5">
                    This game has no categories yet.
                </p>
            ) : (
                <>
                    <div className="d-flex flex-wrap gap-2 mb-3">
                        {data.categories.map((cat) => (
                            <button
                                key={cat.id}
                                type="button"
                                className={`btn btn-sm ${
                                    cat.id === selectedCategoryId
                                        ? 'btn-primary'
                                        : 'btn-outline-secondary'
                                }`}
                                onClick={() => setSelectedCategoryId(cat.id)}
                            >
                                {cat.display}
                            </button>
                        ))}
                    </div>

                    <VisibilitySection
                        gameSlug={data.game.name}
                        gameId={data.game.id}
                        category={selectedCategory}
                    />

                    <TimingSettingsSection
                        gameSlug={data.game.name}
                        gameId={data.game.id}
                        category={selectedCategory}
                    />

                    <MinimumsSection
                        data={data}
                        selectedCategory={selectedCategory}
                    />
                </>
            )}
        </div>
    );
}
