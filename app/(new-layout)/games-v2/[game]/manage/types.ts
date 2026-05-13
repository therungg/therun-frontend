import type { MinimumTime } from '../../../../../types/leaderboard-minimums.types';
import type {
    ResolvedCategory,
    ResolvedGame,
    VariableDef,
} from '../../../../../types/leaderboards.types';

export interface ManagePageData {
    game: ResolvedGame;
    categories: ResolvedCategory[];
    initialCategoryId: number;
    initialVariables: VariableDef[];
    initialMinimums: MinimumTime[];
    initialSlug: string | null;
    initialAbbreviation: string | null;
}
