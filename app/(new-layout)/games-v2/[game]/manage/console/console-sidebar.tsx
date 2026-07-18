'use client';

import clsx from 'clsx';
import {
    ArrowLeftRight,
    ClockHistory,
    Collection,
    Controller,
    Diagram3,
    ExclamationTriangle,
    Eye,
    Flag,
    Gear,
    Grid3x3Gap,
    type Icon as IconType,
    JournalText,
    ListOl,
    PersonX,
    ShieldLock,
    Sliders,
    Stopwatch,
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
    categories: Array<{ id: number; display: string }>;
    selectedCategoryId: number | null;
    onSelectCategory: (id: number) => void;
}

// One consistent icon set (react-bootstrap-icons) — no emoji.
const NAV_ICON: Record<NavItemId, IconType> = {
    attention: ExclamationTriangle,
    roster: ListOl,
    reports: Flag,
    bans: PersonX,
    history: ClockHistory,
    standards: Sliders,
    timing: Stopwatch,
    rules: JournalText,
    variables: Diagram3,
    combinations: Grid3x3Gap,
    'category-settings': Gear,
    'game-details': Controller,
    moderators: ShieldLock,
    groups: Collection,
    'categories-visibility': Eye,
    identifiers: Tag,
    reassign: ArrowLeftRight,
};

export function ConsoleSidebar({
    groups,
    activeItem,
    onSelect,
    attentionCount,
    badgeDegraded = false,
    categories,
    selectedCategoryId,
    onSelectCategory,
}: Props) {
    // The per-category picker only matters when a category-scoped pane is
    // open — every per-category pane (including Minimum time) shares it.
    const activeIsCategoryScoped =
        groups.flatMap((g) => g.items).find((it) => it.id === activeItem)
            ?.categoryScoped ?? false;

    return (
        <nav aria-label="Game admin console">
            {groups.map((group) => (
                <div key={group.id} className={styles.navGroup}>
                    <div className={styles.groupLabel}>{group.label}</div>

                    {group.id === 'per-category' &&
                        activeIsCategoryScoped &&
                        categories.length > 0 && (
                            <div className={styles.pickerWrap}>
                                <select
                                    className={styles.picker}
                                    aria-label="Category"
                                    value={selectedCategoryId ?? ''}
                                    onChange={(e) => {
                                        const id = Number.parseInt(
                                            e.target.value,
                                            10,
                                        );
                                        if (Number.isFinite(id)) {
                                            onSelectCategory(id);
                                        }
                                    }}
                                >
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.display}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

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
                                                    ? `${attentionCount} items need attention — some sources didn't load, actual count may be higher`
                                                    : `${attentionCount} items need attention`
                                            }
                                            title={
                                                badgeDegraded
                                                    ? 'Some sources failed to load — count may be low'
                                                    : undefined
                                            }
                                        >
                                            {attentionCount > 99
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
