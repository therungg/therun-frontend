// One consistent icon set (react-bootstrap-icons) — no emoji. Lives apart
// from the sidebar so the tile grid shows the same glyph per section without
// a second copy of the map.
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
} from 'react-bootstrap-icons';
import type { NavItemId } from './nav-model';

export const NAV_ICON: Record<NavItemId, IconType> = {
    attention: ExclamationTriangle,
    roster: ListOl,
    reports: Flag,
    bans: PersonX,
    history: ClockHistory,
    setup: ListCheck,
    'game-details': Controller,
    categories: ListUl,
    groups: Collection,
    moderators: ShieldLock,
    reassign: ArrowLeftRight,
};
