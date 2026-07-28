'use client';

import clsx from 'clsx';
import {
    ArrowLeftRight,
    ClockHistory,
    Collection,
    Controller,
    ExclamationTriangle,
    Flag,
    type Icon as IconType,
    ListCheck,
    ListOl,
    ListUl,
    PersonX,
    ShieldLock,
    Tag,
} from 'react-bootstrap-icons';
import styles from './console.module.scss';
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

// One consistent icon set (react-bootstrap-icons) — no emoji.
const NAV_ICON: Record<NavItemId, IconType> = {
    attention: ExclamationTriangle,
    roster: ListOl,
    reports: Flag,
    bans: PersonX,
    history: ClockHistory,
    setup: ListCheck,
    'game-details': Controller,
    categories: ListUl,
    groups: Collection,
    identifiers: Tag,
    moderators: ShieldLock,
    reassign: ArrowLeftRight,
};

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
                                {item.id === 'attention' &&
                                    (attentionCount > 0 || badgeDegraded) && (
                                        <span
                                            className={styles.count}
                                            aria-label={
                                                badgeDegraded
                                                    ? attentionCount > 0
                                                        ? `${attentionCount} items need attention — some sources didn't load, actual count may be higher`
                                                        : 'Some sources failed to load — counts may be incomplete'
                                                    : `${attentionCount} items need attention`
                                            }
                                            title={
                                                badgeDegraded
                                                    ? 'Some sources failed to load — counts may be incomplete'
                                                    : undefined
                                            }
                                        >
                                            {badgeDegraded &&
                                            attentionCount === 0
                                                ? '!'
                                                : attentionCount > 99
                                                  ? '99+'
                                                  : `${attentionCount}${badgeDegraded ? '+' : ''}`}
                                        </span>
                                    )}
                            </button>
                        );
                    })}
                </div>
            ))}
        </nav>
    );
}
