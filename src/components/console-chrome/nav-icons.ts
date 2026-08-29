// One consistent icon set (react-bootstrap-icons) — no emoji. Lives apart
// from the sidebar so the tile grid shows the same glyph per section without
// a second copy of the map.
import {
    ArrowLeftRight,
    ClockHistory,
    CloudDownload,
    Collection,
    Controller,
    Diagram3,
    ExclamationTriangle,
    Flag,
    Grid3x3,
    type Icon as IconType,
    Layers,
    ListCheck,
    ListOl,
    ListUl,
    PersonX,
    ShieldLock,
    Speedometer2,
    Trophy,
} from 'react-bootstrap-icons';
import type { NavItemId } from '~app/(new-layout)/games-v2/[game]/manage/console/nav-model';

export const NAV_ICON: Record<NavItemId, IconType> = {
    overview: Speedometer2,
    attention: ExclamationTriangle,
    roster: ListOl,
    reports: Flag,
    bans: PersonX,
    history: ClockHistory,
    setup: ListCheck,
    'game-details': Controller,
    categories: ListUl,
    groups: Collection,
    // Stacked levels, and the template that fans out across them.
    levels: Layers,
    'level-categories': Diagram3,
    // A grid, because that is literally the surface: categories down, options
    // across.
    variables: Grid3x3,
    boards: Trophy,
    moderators: ShieldLock,
    reassign: ArrowLeftRight,
    import: CloudDownload,
};
