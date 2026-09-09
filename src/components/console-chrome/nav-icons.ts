// One consistent icon set (react-bootstrap-icons) — no emoji. Lives apart
// from the sidebar so the tile grid shows the same glyph per section without
// a second copy of the map.
import {
    ArrowLeftRight,
    CheckCircle,
    ClockHistory,
    CloudDownload,
    Collection,
    Controller,
    Diagram3,
    ExclamationTriangle,
    Flag,
    Funnel,
    Grid3x3,
    type Icon as IconType,
    Layers,
    ListCheck,
    ListOl,
    ListUl,
    Palette,
    PersonX,
    ShieldLock,
    Speedometer2,
    Trophy,
} from 'react-bootstrap-icons';
import type { NavItemId } from '~app/(new-layout)/games-v2/[game]/manage/console/nav-model';

export const NAV_ICON: Record<NavItemId, IconType> = {
    overview: Speedometer2,
    'mod-queue': CheckCircle,
    attention: ExclamationTriangle,
    roster: ListOl,
    reports: Flag,
    bans: PersonX,
    history: ClockHistory,
    setup: ListCheck,
    'game-details': Controller,
    theme: Palette,
    categories: ListUl,
    groups: Collection,
    // Stacked levels, and the template that fans out across them.
    levels: Layers,
    'level-categories': Diagram3,
    // A grid, because that is literally the surface: categories down, options
    // across.
    subcategories: Grid3x3,
    filters: Funnel,
    boards: Trophy,
    moderators: ShieldLock,
    reassign: ArrowLeftRight,
    import: CloudDownload,
};
