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

/**
 * The console's spine is the leaderboard's category rail stood on end.
 *
 * On the public board a group of categories is a recessed well with its name
 * engraved into an endcap; the board you are on is the one lit chip. Here
 * each nav group is that same well — its caption engraved across the top,
 * its panes stacked inside, the current pane lit in the board's accent — so
 * a moderator reads the console as the board seen from behind, not as a
 * different product. Doors that are not panes (the wizard, the history
 * drawer) sit under the wells as dashed ghosts, the board's own mark for
 * "a thing you can open, not a place you can be".
 */
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
    const renderItem = (item: NavItem, door = false) => {
        const Icon = icons[item.id];
        const isActive = activeItem === item.id;
        const badge = badges?.[item.id];
        const href = hrefFor?.(item.id);
        const className = clsx(
            styles.navItem,
            door && styles.door,
            href && styles.navLink,
            isActive && styles.active,
            item.reserved && styles.reserved,
        );
        const content = (
            <>
                {Icon && (
                    <Icon
                        size={15}
                        className={styles.navIcon}
                        aria-hidden="true"
                    />
                )}
                <span className={styles.navLabel}>{item.label}</span>
                {item.reserved && <span className={styles.soon}>soon</span>}
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
                <section
                    key={group.id}
                    className={clsx(
                        styles.well,
                        !group.label && styles.wellSolo,
                    )}
                    aria-label={group.label || undefined}
                >
                    {group.label && (
                        <div className={styles.wellCap} aria-hidden="true">
                            {group.label}
                        </div>
                    )}
                    <div className={styles.wellBody}>
                        {group.items.map((item) => renderItem(item))}
                    </div>
                </section>
            ))}
            {footerItems && footerItems.length > 0 && (
                <div className={styles.navFooter}>
                    {footerItems.map((item) => renderItem(item, true))}
                </div>
            )}
        </nav>
    );
}
