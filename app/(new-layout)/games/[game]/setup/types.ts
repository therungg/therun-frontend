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
    /** The category-settings edit right (canConfigureGame) — gates Minimum
     *  time / Runners credited in the category editor and the subcategory
     *  dialog's players section. The whole wizard is already gated on it
     *  (see setup/page.tsx notFound()), but screens thread it explicitly
     *  rather than assuming. */
    canEditStandards: boolean;
    /** ability.can('edit','game') — shows the IGDB re-match controls. */
    canRematch: boolean;
    /** Global admins skip the import step's once-per-day gate (so does the backend). */
    canBypassImportCooldown: boolean;
    /** Server-render stamp used to remount steps when fresh data lands. */
    renderedAt: number;
}

export interface StepProps {
    data: WizardData;
    onAdvance: () => void;
    onBack: () => void;
}
