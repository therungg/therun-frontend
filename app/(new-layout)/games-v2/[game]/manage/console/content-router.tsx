'use client';

import type { ReactNode } from 'react';
import styles from '~src/components/console-chrome/console.module.scss';
import type { ManageCategoryRow, ManageGroup } from '~src/lib/category-mgmt';
import type { CategoryConfigRow } from '~src/lib/console/category-rows';
import type { BoardCompleteness } from '~src/lib/setup/completeness';
import type { BoardHealth } from '~src/lib/setup/health';
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
import type { SrcImportJob } from '../../../../../../types/src-import.types';
import { VariablesGrid } from '../../setup/steps/variables/variables-grid';
import { BoardCuration } from '../boards/board-curation';
import { GameTab } from '../game-tab/game-tab';
import type { ReorderChange } from '../game-tab/reorder-changes';
import { LevelsPane } from '../levels/levels-pane';
import type { AttentionItem } from '../moderation/attention/attention-model';
import { ModApplicationsCard } from '../moderation/attention/mod-applications-card';
import { NeedsAttention } from '../moderation/attention/needs-attention';
import { ActiveBans } from '../moderation/configure/active-bans';
import { BoardOverview } from '../overview/board-overview';
import { ReassignPane } from '../reassignments/reassign-pane';
import { SrcImportPane } from '../src-import/src-import-pane';
import { CategoriesPane } from './categories-pane';
import type { GameDetailsData } from './game-details-pane';
import { GameDetailsPane } from './game-details-pane';
import { ModeratorsPane } from './moderators-pane';
import type { NavGroup, NavItemId } from './nav-model';
import { ThemePane } from './theme-pane';

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
    /** Board overview (the front door) — setup/health rail + import status. */
    setupCompleteness?: BoardCompleteness | null;
    boardHealth?: BoardHealth | null;
    syncJob?: SrcImportJob | null;
    /** Latest settings import, for the overview card's per-kind lines. */
    settingsJob?: SrcImportJob | null;
    /** Latest runs import, for the overview card's per-kind lines. */
    runsJob?: SrcImportJob | null;
    /** Whether this viewer can reach the moderation queue — gates the
     * overview's Needs-attention KPI. */
    canModerate: boolean;
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
                    boardCategories={props.boardCategories}
                    boardGroups={props.boardGroups}
                    metadata={props.gameDetails?.metadata}
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
                    boardCategories={props.boardCategories}
                    boardGroups={props.boardGroups}
                    onGroupsChange={props.onGroupsChange}
                    onRowGroupChange={props.onRowGroupChange}
                />
            );
        case 'levels':
        case 'level-categories':
            // Level categories are the subcategories table inside the Levels
            // pane; the old id survives as a deep link to the same pane (see
            // hiddenLandingIds in nav-model.ts).
            return <LevelsPane gameId={game.id} gameSlug={game.name} />;
        case 'variables':
            // The wizard's step 4 without the wizard: same grid, same staging
            // rules (subcategories preview, filters write through). It reads
            // the game's own categories, not the {id, display} pairs — a
            // category's featured flag decides whether it is a row.
            return (
                <div className={styles.surface}>
                    <div className={styles.paneHeader}>
                        <div>
                            <div className={styles.paneEyebrow}>Structure</div>
                            <h2 className={styles.paneTitle}>
                                Subcategories &amp; filters
                            </h2>
                        </div>
                    </div>
                    <VariablesGrid
                        game={game}
                        categories={props.boardCategories}
                        variables={props.variables}
                        groups={props.boardGroups}
                    />
                </div>
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
        case 'theme':
            return props.gameDetails ? (
                <ThemePane
                    identifiers={props.gameDetails.identifiers}
                    metadata={props.gameDetails.metadata}
                    game={props.gameDetails.game}
                />
            ) : (
                <Placeholder title="Theme">
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
        case 'import':
            return (
                <SrcImportPane
                    gameId={game.id}
                    gameSlug={game.name}
                    gameDisplay={game.display}
                    isAdmin={props.canSiteBan}
                />
            );
        case null:
            return (
                <BoardOverview
                    game={game}
                    rows={props.rows}
                    groups={props.groups}
                    attentionItems={attentionItems}
                    moderators={moderators ?? []}
                    pendingApplications={modApplications?.length ?? 0}
                    setupCompleteness={props.setupCompleteness}
                    boardHealth={props.boardHealth}
                    syncJob={props.syncJob}
                    settingsJob={props.settingsJob}
                    runsJob={props.runsJob}
                    navGroups={props.navGroups}
                    canModerate={props.canModerate}
                    onNavigate={onNavigate}
                    onEditCategory={props.onEditCategory}
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
