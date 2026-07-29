'use client';

import clsx from 'clsx';
import { AttentionBadge } from './attention-badge';
import styles from './console.module.scss';
import { NAV_ICON } from './nav-icons';
import type { NavGroup, NavItemId } from './nav-model';

interface Props {
    groups: NavGroup[];
    activeItem: NavItemId | null;
    onSelect: (id: NavItemId) => void;
    attentionCount: number;
    /** True when one or more attention sources failed to load — the count
     * shown may be an undercount, not a confirmed total. */
    badgeDegraded?: boolean;
}

export function ConsoleSidebar({
    groups,
    activeItem,
    onSelect,
    attentionCount,
    badgeDegraded = false,
}: Props) {
    return (
        <nav aria-label="Game admin console">
            {groups.map((group) => (
                <div key={group.id} className={styles.navGroup}>
                    <div className={styles.groupLabel}>{group.label}</div>

                    {group.items.map((item) => {
                        const Icon = NAV_ICON[item.id];
                        const isActive = activeItem === item.id;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                className={clsx(
                                    styles.navItem,
                                    isActive && styles.active,
                                    item.reserved && styles.reserved,
                                )}
                                aria-current={isActive ? 'page' : undefined}
                                onClick={() => onSelect(item.id)}
                            >
                                <Icon
                                    size={16}
                                    className={styles.navIcon}
                                    aria-hidden="true"
                                />
                                <span className={styles.navLabel}>
                                    {item.label}
                                </span>
                                {item.reserved && (
                                    <span className={styles.soon}>soon</span>
                                )}
                                {item.id === 'attention' && (
                                    <AttentionBadge
                                        count={attentionCount}
                                        degraded={badgeDegraded}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            ))}
        </nav>
    );
}
