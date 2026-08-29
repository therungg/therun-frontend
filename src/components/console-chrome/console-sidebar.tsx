'use client';

import clsx from 'clsx';
import type { Icon as IconType } from 'react-bootstrap-icons';
import Link from '~src/components/link';
import { AttentionBadge } from './attention-badge';
import styles from './console.module.scss';
import type { NavBadge, NavGroup, NavItem } from './nav-types';

interface Props {
    groups: NavGroup[];
    icons: Record<string, IconType>;
    activeItem: string | null;
    onSelect: (id: string) => void;
    /** Per-item status decorations, keyed by item id. */
    badges?: Record<string, NavBadge | undefined>;
    /** When it returns a URL for an item, that item renders as a real link
     * (middle-click, copy-address, prefetch); otherwise a button that goes
     * through onSelect. Link clicks call onLinkNavigate (drawer close), not
     * onSelect — the URL change itself is the navigation. */
    hrefFor?: (id: string) => string | undefined;
    onLinkNavigate?: () => void;
    /** Utility doors under the nav (wizard, history overlay) — rendered
     * apart so items that are not panes don't masquerade as panes. */
    footerItems?: NavItem[];
    ariaLabel?: string;
}

export function ConsoleSidebar({
    groups,
    icons,
    activeItem,
    onSelect,
    badges,
    hrefFor,
    onLinkNavigate,
    footerItems,
    ariaLabel,
}: Props) {
    const renderItem = (item: NavItem) => {
        const Icon = icons[item.id];
        const isActive = activeItem === item.id;
        const badge = badges?.[item.id];
        const href = hrefFor?.(item.id);
        const className = clsx(
            styles.navItem,
            href && styles.navLink,
            isActive && styles.active,
            item.reserved && styles.reserved,
        );
        const content = (
            <>
                {Icon && (
                    <Icon
                        size={16}
                        className={styles.navIcon}
                        aria-hidden="true"
                    />
                )}
                <span className={styles.navLabel}>{item.label}</span>
                {item.reserved && <span className={styles.soon}>soon</span>}
                {/* TODO(boards mark-for-later badge): a whole-game "marked
                 * for later" count needs a backend endpoint — the roster
                 * endpoint only supports markedForLater=true scoped to one
                 * category, and summing it across every category here would
                 * mean N roster calls per render. Skipped rather than faked;
                 * wire this up once that count endpoint exists (see
                 * task-13-report.md). */}
                {badge?.count != null && (
                    <AttentionBadge
                        count={badge.count}
                        degraded={badge.degraded}
                    />
                )}
                {badge?.dot && badge.count == null && (
                    <>
                        <span
                            className={styles.dot}
                            data-tone={badge.dot}
                            aria-hidden="true"
                        />
                        {badge.dotLabel && (
                            <span className="visually-hidden">
                                {badge.dotLabel}
                            </span>
                        )}
                    </>
                )}
            </>
        );
        if (href) {
            return (
                <Link
                    key={item.id}
                    href={href}
                    scroll={false}
                    className={className}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={onLinkNavigate}
                >
                    {content}
                </Link>
            );
        }
        return (
            <button
                key={item.id}
                type="button"
                className={className}
                aria-current={isActive ? 'page' : undefined}
                aria-haspopup={item.hasPopup ? 'dialog' : undefined}
                onClick={() => onSelect(item.id)}
            >
                {content}
            </button>
        );
    };

    return (
        <nav aria-label={ariaLabel ?? 'Console navigation'}>
            {groups.map((group) => (
                <div key={group.id} className={styles.navGroup}>
                    {group.label && (
                        <div className={styles.groupLabel}>{group.label}</div>
                    )}
                    {group.items.map(renderItem)}
                </div>
            ))}
            {footerItems && footerItems.length > 0 && (
                <div className={styles.navFooter}>
                    {footerItems.map(renderItem)}
                </div>
            )}
        </nav>
    );
}
