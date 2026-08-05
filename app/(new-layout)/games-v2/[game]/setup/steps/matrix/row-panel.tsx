'use client';

import type { BoardDefaults } from '~src/lib/setup/board-defaults';
import type { ResolvedCategory } from '../../../../../../../types/leaderboards.types';
import { EmblemPanel } from './emblem-panel';
import styles from './matrix.module.scss';
import { RulesPanel } from './rules-panel';

export const PANES = [
    { id: 'rules', label: 'Rules' },
    { id: 'emblem', label: 'Emblem' },
] as const;

export type PaneId = (typeof PANES)[number]['id'];

interface Props {
    gameSlug: string;
    gameId: number;
    category: ResolvedCategory;
    defaults: BoardDefaults;
    pane: PaneId;
    onPane: (pane: PaneId) => void;
    onClose: () => void;
}

/**
 * Everything about one category that is not worth a matrix column, expanded in
 * place under its row.
 *
 * This is what replaces the category detail screen. The rule it follows: a
 * setting earns a *column* when it is scannable across the whole board (a
 * timing, a minimum, a direction — one glance tells you which categories
 * deviate) and a *pane* when it is not (a wall of rules text, an image, a pair
 * of switches nobody compares across rows). Neither earns a route, because
 * losing the list is what made the old step 4 unusable — a moderator working
 * down a board has to keep their place.
 *
 * One expansion per row at a time, with the panes as tabs, so opening the
 * second thing you need never costs a navigation.
 */
export function RowPanel({
    gameSlug,
    gameId,
    category,
    defaults,
    pane,
    onPane,
    onClose,
}: Props) {
    return (
        <div className={styles.rowPanel}>
            <div className={styles.paneHead}>
                <span className={styles.paneTitle}>{category.display}</span>
                <div className={styles.paneTabs} role="tablist">
                    {PANES.map((p) => (
                        <button
                            key={p.id}
                            type="button"
                            role="tab"
                            aria-selected={pane === p.id}
                            className={`${styles.paneTab} ${
                                pane === p.id ? styles.paneTabOn : ''
                            }`}
                            onClick={() => onPane(p.id)}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
                <button
                    type="button"
                    className={styles.paneClose}
                    onClick={onClose}
                    aria-label={`Close ${category.display}`}
                >
                    ✕
                </button>
            </div>

            {pane === 'rules' && (
                <RulesPanel
                    gameSlug={gameSlug}
                    gameId={gameId}
                    category={category}
                    template={defaults.rulesTemplate}
                    onClose={onClose}
                />
            )}
            {pane === 'emblem' && (
                <EmblemPanel
                    gameSlug={gameSlug}
                    gameId={gameId}
                    category={category}
                />
            )}
        </div>
    );
}
