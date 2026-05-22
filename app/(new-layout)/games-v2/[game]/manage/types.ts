import type { ManageCategoryRow, ManageGroup } from '~src/lib/category-mgmt';
import type { MinimumTime } from '../../../../../types/leaderboard-minimums.types';
import type {
    ResolvedCategory,
    ResolvedGame,
} from '../../../../../types/leaderboards.types';

export type ManageTab = 'game' | 'category';

export interface ManagePageData {
    game: ResolvedGame;
    categories: ResolvedCategory[];
    initialCategoryId: number;
    initialMinimum: MinimumTime | null;
    initialSlug: string | null;
    initialAbbreviation: string | null;
    initialRows: ManageCategoryRow[];
    initialGroups: ManageGroup[];
    initialTab: ManageTab;
}
