'use client';

import { useState, useTransition } from 'react';
import type { MinimumTime } from '../../../../../../types/leaderboard-minimums.types';
import type {
    ResolvedCategory,
    VariableDef,
} from '../../../../../../types/leaderboards.types';
import type { ManagePageData } from '../types';
import { loadCategoryDataAction } from './load-category-data.action';
import { MinimumRow } from './minimum-row';

interface Props {
    data: ManagePageData;
}

export function MinimumsSection({ data }: Props) {
    const [selectedCategoryId, setSelectedCategoryId] = useState(
        data.initialCategoryId,
    );
    const [variables, setVariables] = useState<VariableDef[]>(
        data.initialVariables,
    );
    const [minimums, setMinimums] = useState<MinimumTime[]>(
        data.initialMinimums,
    );
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isLoading, startLoadTransition] = useTransition();

    const selectedCategory: ResolvedCategory | undefined = data.categories.find(
        (c) => c.id === selectedCategoryId,
    );

    const switchCategory = (cat: ResolvedCategory) => {
        if (cat.id === selectedCategoryId) return;
        setSelectedCategoryId(cat.id);
        setLoadError(null);
        startLoadTransition(async () => {
            const res = await loadCategoryDataAction({
                gameSlug: data.game.name,
                gameId: data.game.id,
                categorySlug: cat.name,
                categoryId: cat.id,
            });
            if ('error' in res) {
                setLoadError(res.error);
                setVariables([]);
                setMinimums([]);
            } else {
                setVariables(res.result.variables);
                setMinimums(res.result.minimums);
            }
        });
    };

    return (
        <section>
            <h2 className="h5 mb-3">Minimum Times</h2>

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
                        onClick={() => switchCategory(cat)}
                        disabled={isLoading}
                    >
                        {cat.display}
                    </button>
                ))}
            </div>

            {loadError && (
                <div className="alert alert-danger" role="alert">
                    {loadError}
                </div>
            )}

            {selectedCategory && (
                <div className="table-responsive">
                    <table className="table table-sm align-middle">
                        <thead>
                            <tr>
                                <th>Subcategory</th>
                                <th>Min RT</th>
                                <th>Min GT</th>
                                <th>Set by</th>
                                <th>Updated</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {minimums.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-muted">
                                        No minimums set for this category yet.
                                    </td>
                                </tr>
                            ) : (
                                minimums.map((row) => (
                                    <MinimumRow
                                        key={row.subcategoryHash}
                                        row={row}
                                        variables={variables}
                                        onEdit={() => {
                                            /* wired up in Task 6 */
                                        }}
                                        onDelete={() => {
                                            /* wired up in Task 7 */
                                        }}
                                        isBusy={isLoading}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
