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
import type { LevelTemplate } from '../../../../../types/levels.types';
import type { BoardPolicyRow } from '../../../../../types/moderation.types';

export interface WizardData {
    game: ResolvedGame;
    stats: QuickStats;
    categories: ResolvedCategory[];
    groups: ResolvedGroup[];
    levelTemplates: LevelTemplate[];
    variables: VariableRow[];
    policies: BoardPolicyRow[];
    moderators: GameModerator[];
    identifiers: GameIdentifiers;
    metadata: GameMetadata;
    completeness: BoardCompleteness;
    /** ability.can('edit','moderators') — gates Minimum time in the editor. */
    canEditStandards: boolean;
    /** ability.can('edit','game') — shows the IGDB re-match controls. */
    canRematch: boolean;
    /** Server-render stamp used to remount steps when fresh data lands. */
    renderedAt: number;
}

export interface StepProps {
    data: WizardData;
    onAdvance: () => void;
    onBack: () => void;
}
