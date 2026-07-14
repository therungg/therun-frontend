import type { GameIdentifiers, GameMetadata } from '~src/lib/game-mgmt';
import type { BoardCompleteness } from '~src/lib/setup/completeness';
import type { GameModerator } from '../../../../../types/board-claims.types';
import type {
    QuickStats,
    ResolvedCategory,
    ResolvedGame,
    ResolvedGroup,
    VariableRow,
} from '../../../../../types/leaderboards.types';
import type { BoardPolicyRow } from '../../../../../types/moderation.types';

export interface WizardData {
    game: ResolvedGame;
    stats: QuickStats;
    categories: ResolvedCategory[];
    groups: ResolvedGroup[];
    variables: VariableRow[];
    policies: BoardPolicyRow[];
    moderators: GameModerator[];
    identifiers: GameIdentifiers;
    metadata: GameMetadata;
    completeness: BoardCompleteness;
    /** categoryId → fastest verified time (ms) in its primary timing, or null. */
    wrTimes: Record<number, number | null>;
}

export interface StepProps {
    data: WizardData;
    onAdvance: () => void;
    onBack: () => void;
}
