// Generic nav shape for ConsoleChrome/ConsoleSidebar — game-agnostic so
// /settings can reuse the same chrome with its own item ids. Manage's
// `nav-model.ts` NavGroup/NavItem satisfy these structurally (NavItemId is a
// string union).
import type { AttentionBadgeCopy } from './attention-badge-content';

export interface NavItem {
    id: string;
    label: string;
    reserved?: boolean;
    /** Set when the item's button opens a dialog/drawer rather than
     * navigating — renders `aria-haspopup="dialog"`. */
    hasPopup?: boolean;
}

export interface NavGroup {
    id: string;
    label: string;
    items: NavItem[];
}

/** Ambient per-item status: a count pill (optionally marked degraded when a
 * source failed and the count may be an undercount) or a small status dot. */
export interface NavBadge {
    count?: number;
    degraded?: boolean;
    dot?: 'info' | 'warning' | 'danger';
    /** Text alternative for the dot — it's otherwise a color-only signal. */
    dotLabel?: string;
    /** Overrides the count pill's generic wording — the Queue badge passes
     * `QUEUE_BADGE_COPY` so it reads as "N runs waiting on you". */
    copy?: AttentionBadgeCopy;
}
