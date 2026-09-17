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
import { LegacyLevelSubcategories } from '../../manage/levels/legacy-level-subcategories';
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
                />
            );
        case 'subcategories':
            return kind === 'categories' ? (
                <VariablesGrid
                    kind="categories"
                    game={game}
                    categories={categories}
                    variables={variables}
                    groups={groups}
                />
            ) : (
                <LegacyLevelSubcategories game={game} />
            );
    }
}
