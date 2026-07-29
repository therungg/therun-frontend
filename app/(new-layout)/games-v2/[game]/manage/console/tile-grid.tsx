'use client';

import { CONCEPT_TILE, type TileConceptId } from '~src/lib/console/vocabulary';
import { AttentionBadge } from './attention-badge';
import styles from './console.module.scss';
import { NAV_ICON } from './nav-icons';
import type { NavGroup, NavItemId } from './nav-model';

interface Props {
    /** Already permission-filtered by buildNav() — the grid does no gating
     * of its own, so it can never disagree with the sidebar. */
    groups: NavGroup[];
    onNavigate: (id: NavItemId) => void;
    attentionCount: number;
    badgeDegraded?: boolean;
    /** Mod applications awaiting a decision. */
    pendingApplications?: number;
}

/**
 * The console front door: every section this viewer can reach, described as a
 * job rather than named as a noun. The sidebar stays the fast path for people
 * who already know where things are; this is for the moderator who does not.
 *
 * Tiles call the same `onNavigate` the sidebar calls, so History still opens
 * as a drawer and Setup still leaves the console — there are no navigation
 * paths here that the sidebar does not already have.
 */
export function TileGrid({
    groups,
    onNavigate,
    attentionCount,
    badgeDegraded = false,
    pendingApplications = 0,
}: Props) {
    return (
        <div className={styles.tileGroups}>
            {groups.map((group) => {
                // `reports` has no CONCEPT_TILE entry — see the comment there.
                const items = group.items.filter((it) => it.id in CONCEPT_TILE);
                if (items.length === 0) return null;

                return (
                    <section key={group.id}>
                        <div className={styles.groupLabel}>{group.label}</div>
                        <div className={styles.tileGrid}>
                            {items.map((item) => {
                                const Icon = NAV_ICON[item.id];
                                const tile =
                                    CONCEPT_TILE[item.id as TileConceptId];
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        className={styles.tile}
                                        onClick={() => onNavigate(item.id)}
                                    >
                                        <span className={styles.tileTop}>
                                            <Icon
                                                size={20}
                                                className={styles.tileIcon}
                                                aria-hidden="true"
                                            />
                                            {item.id === 'attention' && (
                                                <AttentionBadge
                                                    count={attentionCount}
                                                    degraded={badgeDegraded}
                                                />
                                            )}
                                            {item.id === 'moderators' &&
                                                pendingApplications > 0 && (
                                                    <span
                                                        className={styles.count}
                                                        aria-label={`${pendingApplications} moderator applications waiting`}
                                                    >
                                                        {pendingApplications}
                                                    </span>
                                                )}
                                        </span>
                                        <span className={styles.tileAction}>
                                            {tile.action}
                                        </span>
                                        <span className={styles.tileBlurb}>
                                            {tile.blurb}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}
