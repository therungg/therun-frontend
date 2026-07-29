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
} from '../../../../../../types/leaderboards.types';
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
import type { NavItemId } from './nav-model';

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
    /** Live item-count reporter from NeedsAttention, forwarded to the sidebar badge. */
    onAttentionCountChange?: (count: number) => void;
    initialSlug: string | null;
    gameDetails?: GameDetailsData | null;
    rows: ManageCategoryRow[];
    groups: ManageGroup[];
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
        // Both items live inside the single GameTab component — it scrolls to
        // the matching section rather than remounting.
        case 'groups':
        case 'identifiers':
            return (
                <GameTab
                    game={game}
                    activeSection={activeItem}
                    initialSlug={props.initialSlug}
                    rows={props.rows}
                    groups={props.groups}
                    onGroupsChange={props.onGroupsChange}
                    onRowChange={props.onRowChange}
                    onRowGroupChange={props.onRowGroupChange}
                    onRowsReorder={props.onRowsReorder}
                    onEditCategory={props.onEditCategory}
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
                    Couldn't load game details — reload the page.
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
        default:
            return (
                <Placeholder title="Admin console">
                    Select an item from the sidebar.
                </Placeholder>
            );
    }
}
