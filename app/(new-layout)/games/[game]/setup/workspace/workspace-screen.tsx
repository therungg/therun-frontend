'use client';

import type { GameMetadata } from '~src/lib/game-mgmt';
import type { WorkspaceKind, WorkspaceSubId } from '~src/lib/setup/workspace';
import type {
    ResolvedCategory,
    ResolvedGame,
    ResolvedGroup,
    VariableRow,
} from '../../../../../../types/leaderboards.types';
import type { BoardPolicyRow } from '../../../../../../types/moderation.types';
import { CategoryMatrix } from '../steps/matrix/category-matrix';
import { VariablesGrid } from '../steps/variables/variables-grid';
import { BoardList } from './board-list';
import { CategoryGroups } from './category-groups';

export interface WorkspaceScreenProps {
    kind: WorkspaceKind;
    sub: WorkspaceSubId;
    game: ResolvedGame;
    categories: ResolvedCategory[];
    groups: ResolvedGroup[];
    variables: VariableRow[];
    policies: BoardPolicyRow[];
    metadata: GameMetadata | null;
    /** `?cat=<id>`: open that category's rules on the Settings screen. */
    initialOpenCategoryId?: number | null;
    /** Moves to this kind's List screen (an empty Settings screen offers it). */
    onGoToList?: () => void;
    /** Moves to this kind's Subcategories screen (the Settings screen's
     *  subcategory dialog offers it when a board has none yet). */
    onGoToSubcategories?: () => void;
    /** The console: a screen is a page you manage, so Subcategories opens as
     *  a table of what exists. The wizard keeps everything unfolded. */
    tableFirst?: boolean;
    /** Whether this viewer may write this board's standards (minimum time,
     *  runners credited) — the Settings screen's own permission, distinct
     *  from the moderator gate that gets a viewer to this screen at all.
     *  Defaults true for the wizard, which already gates the whole step
     *  behind it; the console passes its own configure-vs-moderate read. */
    canEdit?: boolean;
}

/** The one screen body both the wizard and the console render. */
export function WorkspaceScreen({
    kind,
    sub,
    game,
    categories,
    groups,
    variables,
    policies,
    metadata,
    initialOpenCategoryId = null,
    onGoToList,
    onGoToSubcategories,
    tableFirst = false,
    canEdit = true,
}: WorkspaceScreenProps) {
    switch (sub) {
        case 'list':
            return (
                <BoardList
                    kind={kind}
                    game={game}
                    categories={categories}
                    groups={groups}
                    metadata={metadata}
                />
            );
        case 'groups':
            // Groups are categories-only; levels are one section.
            return kind === 'categories' ? (
                <CategoryGroups
                    game={game}
                    categories={categories}
                    groups={groups}
                />
            ) : null;
        case 'settings':
            return (
                <CategoryMatrix
                    kind={kind}
                    game={game}
                    categories={categories}
                    groups={groups}
                    policies={policies}
                    variables={variables}
                    initialOpenCategoryId={initialOpenCategoryId}
                    onGoToList={onGoToList}
                    onGoToSubcategories={onGoToSubcategories}
                    canEdit={canEdit}
                />
            );
        case 'subcategories':
            return (
                <VariablesGrid
                    kind={kind}
                    game={game}
                    categories={categories}
                    variables={variables}
                    groups={groups}
                    tableFirst={tableFirst}
                />
            );
    }
}
