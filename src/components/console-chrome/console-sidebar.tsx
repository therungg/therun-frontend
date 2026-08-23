'use client';

import clsx from 'clsx';
import type { Icon as IconType } from 'react-bootstrap-icons';
import { AttentionBadge } from './attention-badge';
import styles from './console.module.scss';
import type { NavGroup } from './nav-types';

interface Props {
    groups: NavGroup[];
    icons: Record<string, IconType>;
    activeItem: string | null;
    onSelect: (id: string) => void;
    attentionCount?: number;
    /** True when one or more attention sources failed to load — the count
     * shown may be an undercount, not a confirmed total. */
    badgeDegraded?: boolean;
    ariaLabel?: string;
}

export function ConsoleSidebar({
    groups,
    icons,
    activeItem,
    onSelect,
    attentionCount = 0,
    badgeDegraded = false,
    ariaLabel,
}: Props) {
    return (
        <nav aria-label={ariaLabel ?? 'Console navigation'}>
            {groups.map((group) => (
                <div key={group.id} className={styles.navGroup}>
                    <div className={styles.groupLabel}>{group.label}</div>

                    {group.items.map((item) => {
                        const Icon = icons[item.id];
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
                                {Icon && (
                                    <Icon
                                        size={16}
                                        className={styles.navIcon}
                                        aria-hidden="true"
                                    />
                                )}
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
                                {/* TODO(boards mark-for-later badge): a
                                 * whole-game "marked for later" count needs a
                                 * backend endpoint — the roster endpoint only
                                 * supports markedForLater=true scoped to one
                                 * category, and summing it across every
                                 * category here would mean N roster calls per
                                 * render. Skipped rather than faked; wire this
                                 * up once that count endpoint exists (see
                                 * task-13-report.md). */}
                            </button>
                        );
                    })}
                </div>
            ))}
        </nav>
    );
}
