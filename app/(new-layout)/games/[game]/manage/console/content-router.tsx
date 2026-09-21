'use client';

import type { ReactNode } from 'react';
import styles from '~src/components/console-chrome/console.module.scss';
import type { ManageCategoryRow, ManageGroup } from '~src/lib/category-mgmt';
import type { CategoryConfigRow } from '~src/lib/console/category-rows';
import type { BoardCompleteness } from '~src/lib/setup/completeness';
import type { BoardHealth } from '~src/lib/setup/health';
import { workspacePaneOf } from '~src/lib/setup/workspace';
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
import type {
    WorklistDigest,
    WorklistPage,
} from '../../../../../../types/worklist.types';
import type { EmulatorPolicy } from '../../rules/rules-panel';
import { BoardCuration } from '../boards/board-curation';
import { MatchRunnersPane } from '../match-runners/match-runners-pane';
import type { AttentionItem } from '../moderation/attention/attention-model';
import { ModApplicationsCard } from '../moderation/attention/mod-applications-card';
import { NeedsAttention } from '../moderation/attention/needs-attention';
import { ActiveBans } from '../moderation/configure/active-bans';
import { ModQueuePane } from '../moderation/queue/mod-queue-pane';
import { VerificationPane } from '../moderation/verification/verification-pane';
import { WorklistPane } from '../moderation/worklist/worklist-pane';
import { BoardOverview } from '../overview/board-overview';
import { ReassignPane } from '../reassignments/reassign-pane';
import { SrcImportPane } from '../src-import/src-import-pane';
import type { GameDetailsData } from './game-details-pane';
import { GameDetailsPane } from './game-details-pane';
import { ModeratorsPane } from './moderators-pane';
import type { NavGroup, NavItemId } from './nav-model';
import { ThemePane } from './theme-pane';
import { WorkspacePane } from './workspace-pane';

export interface ContentRouterProps {
    activeItem: NavItemId | null;
    game: ResolvedGame;
    categories: Array<{ id: number; display: string }>;
    /** Per-category configuration for the index matrix. */
    categoryConfig: CategoryConfigRow[];
    attentionItems: AttentionItem[];
    degradedSources: string[];
    /** The inbox hasn't landed yet — the pane waits rather than announcing an
     * empty queue it can't vouch for. */
    attentionPending?: boolean;
    modApplications?: BoardClaimRequest[];
    moderators?: GameModerator[];
    /** Full category/group rows for the Boards pane — `categories` above is
     * stripped down to {id, display} for panes that don't need the rest. */
    boardCategories: ResolvedCategory[];
    boardGroups: ResolvedGroup[];
    variables: VariableRow[];
    policies: BoardPolicyRow[];
    /** The game's own rules, shown inline where a run is judged. */
    gameRules?: string | null;
    emulatorPolicy?: EmulatorPolicy;
    /** Whether this viewer can see the board-controls toolbar in the Boards
     * pane — a moderator without configure sees the board and row actions,
     * but not that toolbar (BoardCuration gates it internally). */
    canConfigureBoards: boolean;
    /** Viewer may file site-wide anonymize bans from the Boards pane —
     * admins only, threaded through to RowActions. */
    canSiteBan: boolean;
    /** canSeeBoards, for the panes' links to the public board. */
    boardsVisible: boolean;
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
    /** Seven-day history of what was decided and flagged, for the overview's
     * queue summary. Unresolved — the summary streams. */
    digest?: Promise<WorklistDigest | null>;
    /** First page of the mod queue, for the overview's queue summary.
     * Unresolved — the summary streams. */
    worklist?: Promise<WorklistPage | null>;
    /** Whether this viewer can reach the moderation queue — gates the
     * overview's Needs-attention KPI. */
    canModerate: boolean;
    /** Live worklist count from the pane, forwarded to the sidebar badge. */
    onQueueCountChange?: (count: number) => void;
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

    const workspace = workspacePaneOf(activeItem);
    if (workspace) {
        return (
            <WorkspacePane
                key={activeItem}
                kind={workspace.kind}
                sub={workspace.sub}
                game={game}
                categories={props.boardCategories}
                groups={props.boardGroups}
                variables={props.variables}
                policies={props.policies}
                metadata={props.gameDetails?.metadata ?? null}
                onGoToList={() => onNavigate(`${workspace.kind}/list`)}
                onGoToSubcategories={() =>
                    onNavigate(`${workspace.kind}/subcategories`)
                }
                canEdit={props.canConfigureBoards}
            />
        );
    }

    switch (activeItem) {
        case 'mod-queue':
            return (
                <WorklistPane
                    gameSlug={game.name}
                    gameId={game.id}
                    gameDisplay={game.display}
                    categories={categories}
                    boardCategories={props.boardCategories}
                    variables={props.variables}
                    canSiteBan={props.canSiteBan}
                    gameRules={props.gameRules}
                    emulatorPolicy={props.emulatorPolicy}
                    boardGroups={props.boardGroups}
                    boardsVisible={props.boardsVisible}
                    onNeedsYouChange={props.onQueueCountChange}
                    onNavigate={onNavigate}
                />
            );
        case 'queue-history':
            return (
                <ModQueuePane
                    gameSlug={game.name}
                    gameId={game.id}
                    gameDisplay={game.display}
                    categories={categories}
                    boardCategories={props.boardCategories}
                    variables={props.variables}
                    canSiteBan={props.canSiteBan}
                    gameRules={props.gameRules}
                    emulatorPolicy={props.emulatorPolicy}
                    boardGroups={props.boardGroups}
                    boardsVisible={props.boardsVisible}
                />
            );
        case 'auto-verify':
            return (
                <VerificationPane
                    gameSlug={game.name}
                    gameDisplay={game.display}
                    rows={props.rows}
                    groups={props.groups}
                    boardsVisible={props.boardsVisible}
                />
            );
        case 'attention':
            return (
                <>
                    {modApplications && modApplications.length > 0 && (
                        <ModApplicationsCard
                            gameSlug={game.name}
                            applications={modApplications}
                        />
                    )}
                    {props.attentionPending ? (
                        // Same anatomy as the loaded pane — the heading is
                        // there from the start, only the list is waiting.
                        <div>
                            <header className={styles.paneHeader}>
                                <div>
                                    <div className={styles.paneEyebrow}>
                                        Queue
                                    </div>
                                    <h2 className={styles.paneTitle}>
                                        Needs attention
                                    </h2>
                                </div>
                            </header>
                            <div
                                className={styles.skeleton}
                                aria-busy
                                aria-label="Loading what needs attention"
                            />
                        </div>
                    ) : (
                        <NeedsAttention
                            gameSlug={game.name}
                            gameId={game.id}
                            gameDisplay={game.display}
                            items={attentionItems}
                            degradedSources={degradedSources}
                            categories={categories}
                            boardCategories={props.boardCategories}
                            variables={props.variables}
                            canSiteBan={props.canSiteBan}
                            gameRules={props.gameRules}
                            emulatorPolicy={props.emulatorPolicy}
                            boardGroups={props.boardGroups}
                            boardsVisible={props.boardsVisible}
                            onCountChange={props.onAttentionCountChange}
                        />
                    )}
                </>
            );
        case 'bans':
            return (
                <ActiveBans
                    gameSlug={game.name}
                    gameId={game.id}
                    gameDisplay={game.display}
                    boardCategories={props.boardCategories}
                    variables={props.variables}
                    canSiteBan={props.canSiteBan}
                    gameRules={props.gameRules}
                    emulatorPolicy={props.emulatorPolicy}
                    boardGroups={props.boardGroups}
                    boardsVisible={props.boardsVisible}
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
                    boardsVisible={props.boardsVisible}
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
                    Couldn’t load game details. Reload the page.
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
                    Couldn’t load game details. Reload the page.
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
        case 'match-runners':
            return <MatchRunnersPane gameSlug={game.name} />;
        case null:
            return (
                <BoardOverview
                    game={game}
                    boardsVisible={props.boardsVisible}
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
                    digest={props.digest}
                    worklist={props.worklist}
                    variables={props.variables}
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
