'use client';

import type { ReactNode } from 'react';
import type { ManageCategoryRow, ManageGroup } from '~src/lib/category-mgmt';
import type { CategoryConfigRow } from '~src/lib/console/category-rows';
import type {
    BoardClaimRequest,
    GameModerator,
} from '../../../../../../types/board-claims.types';
import type {
    ResolvedCategory,
    ResolvedGame,
    ResolvedGroup,
    VariableRow,
} from '../../../../../../types/leaderboards.types';
import type { BoardPolicyRow } from '../../../../../../types/moderation.types';
import { BoardCuration } from '../boards/board-curation';
import { CategorySettingsSection } from '../category-tab/category-settings-section';
import { RulesSection } from '../category-tab/rules-section';
import { GameTab } from '../game-tab/game-tab';
import type { ReorderChange } from '../game-tab/reorder-changes';
import type { AttentionItem } from '../moderation/attention/attention-model';
import { ModApplicationsCard } from '../moderation/attention/mod-applications-card';
import { NeedsAttention } from '../moderation/attention/needs-attention';
import { ActiveBans } from '../moderation/configure/active-bans';
import { Standards } from '../moderation/configure/standards';
import { ReassignPane } from '../reassignments/reassign-pane';
import { TimingSettingsSection } from '../timing/timing-settings-section';
import { CombinationsSection } from '../variables/combinations-section';
import { VariablesSection } from '../variables/variables-section';
import { CategoriesPane } from './categories-pane';
import styles from './console.module.scss';
import type { GameDetailsData } from './game-details-pane';
import { GameDetailsPane } from './game-details-pane';
import { ModeratorsPane } from './moderators-pane';
import type { NavGroup, NavItemId } from './nav-model';
import { TileGrid } from './tile-grid';

export interface ContentRouterProps {
    activeItem: NavItemId | null;
    game: ResolvedGame;
    categories: Array<{ id: number; display: string }>;
    /** Per-category configuration for the index matrix. */
    categoryConfig: CategoryConfigRow[];
    attentionItems: AttentionItem[];
    degradedSources: string[];
    modApplications?: BoardClaimRequest[];
    moderators?: GameModerator[];
    /** Full category/group rows for the Boards pane — `categories` above is
     * stripped down to {id, display} for panes that don't need the rest. */
    boardCategories: ResolvedCategory[];
    boardGroups: ResolvedGroup[];
    variables: VariableRow[];
    policies: BoardPolicyRow[];
    /** Whether this viewer can see the board-controls toolbar in the Boards
     * pane — a moderator without configure sees the board and row actions,
     * but not that toolbar (BoardCuration gates it internally). */
    canConfigureBoards: boolean;
    /** Viewer may file site-wide anonymize bans from the Boards pane —
     * admins only, threaded through to RowActions. */
    canSiteBan: boolean;
    /** Live item-count reporter from NeedsAttention, forwarded to the sidebar badge. */
    onAttentionCountChange?: (count: number) => void;
    gameDetails?: GameDetailsData | null;
    rows: ManageCategoryRow[];
    groups: ManageGroup[];
    /** Permission-filtered console nav, for the tile grid. Distinct from
     * `groups`, which is the category-grouping model. */
    navGroups: NavGroup[];
    /** Pane switcher, shared with the sidebar — the tile grid calls it too. */
    onNavigate: (id: NavItemId) => void;
    /** Live attention total for the grid's badge. */
    attentionCount: number;
    onGroupsChange: (g: ManageGroup[]) => void;
    onRowChange: (
        categoryId: number,
        patch: { isMain?: boolean; active?: boolean },
    ) => void;
    onRowGroupChange: (
        categoryId: number,
        groupId: number | null,
        groupName: string | null,
    ) => void;
    onRowsReorder: (changes: ReorderChange[]) => void;
    onEditCategory: (categoryId: number) => void;
}

function Placeholder({
    title,
    children,
}: {
    title: string;
    children?: ReactNode;
}) {
    return (
        <div className={styles.surface}>
            <div className={styles.paneHeader}>
                <h2 className={styles.paneTitle}>{title}</h2>
            </div>
            <p className="text-muted mb-0">{children}</p>
        </div>
    );
}

export function ContentRouter(props: ContentRouterProps) {
    const {
        activeItem,
        game,
        categories,
        attentionItems,
        degradedSources,
        modApplications,
        moderators,
        onNavigate,
        attentionCount,
    } = props;

    switch (activeItem) {
        case 'attention':
            return (
                <>
                    {modApplications && modApplications.length > 0 && (
                        <ModApplicationsCard
                            gameSlug={game.name}
                            applications={modApplications}
                        />
                    )}
                    <NeedsAttention
                        gameSlug={game.name}
                        gameDisplay={game.display}
                        items={attentionItems}
                        degradedSources={degradedSources}
                        categories={categories}
                        onCountChange={props.onAttentionCountChange}
                    />
                </>
            );
        case 'bans':
            return <ActiveBans gameSlug={game.name} />;
        case 'categories':
            return (
                <CategoriesPane
                    game={game}
                    rows={props.rows}
                    config={props.categoryConfig}
                    groups={props.groups}
                    onRowChange={props.onRowChange}
                    onRowGroupChange={props.onRowGroupChange}
                    onRowsReorder={props.onRowsReorder}
                    onGroupsChange={props.onGroupsChange}
                    onEditCategory={props.onEditCategory}
                />
            );
        case 'groups':
            return (
                <GameTab
                    game={game}
                    rows={props.rows}
                    groups={props.groups}
                    onGroupsChange={props.onGroupsChange}
                    onRowGroupChange={props.onRowGroupChange}
                />
            );
        case 'boards':
            return (
                <BoardCuration
                    game={game}
                    categories={props.boardCategories}
                    groups={props.boardGroups}
                    variables={props.variables}
                    policies={props.policies}
                    canConfigure={props.canConfigureBoards}
                    canSiteBan={props.canSiteBan}
                    context="console"
                />
            );
        case 'game-details':
            return props.gameDetails ? (
                <GameDetailsPane
                    identifiers={props.gameDetails.identifiers}
                    metadata={props.gameDetails.metadata}
                    game={props.gameDetails.game}
                    canRematch={props.gameDetails.canRematch}
                />
            ) : (
                <Placeholder title="Details & metadata">
                    Couldn’t load game details — reload the page.
                </Placeholder>
            );
        case 'moderators':
            return (
                <ModeratorsPane
                    gameSlug={game.name}
                    gameId={game.id}
                    moderators={moderators ?? []}
                    pendingApplications={modApplications?.length ?? 0}
                />
            );
        case 'reassign':
            return (
                <ReassignPane
                    gameId={game.id}
                    gameSlug={game.name}
                    gameDisplay={game.display}
                    categories={categories}
                    // Nothing tracks a "current" category any more — the
                    // sidebar picker is gone and per-category work lives on
                    // its own route. Reassign picks its own source.
                    selectedCategory={null}
                />
            );
        case null:
            return (
                <TileGrid
                    groups={props.navGroups}
                    onNavigate={onNavigate}
                    attentionCount={attentionCount}
                    badgeDegraded={degradedSources.length > 0}
                    pendingApplications={modApplications?.length ?? 0}
                />
            );
        default:
            return (
                <Placeholder title="Admin console">
                    Select an item from the sidebar.
                </Placeholder>
            );
    }
}
