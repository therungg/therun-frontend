'use client';

import type { ReactNode } from 'react';
import type { ManageCategoryRow, ManageGroup } from '~src/lib/category-mgmt';
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
import type { AttentionItem } from '../moderation/attention/attention-model';
import { ModApplicationsCard } from '../moderation/attention/mod-applications-card';
import { NeedsAttention } from '../moderation/attention/needs-attention';
import { ActiveBans } from '../moderation/configure/active-bans';
import { Standards } from '../moderation/configure/standards';
import { ReassignPane } from '../reassignments/reassign-pane';
import { TimingSettingsSection } from '../timing/timing-settings-section';
import { CombinationsSection } from '../variables/combinations-section';
import { VariablesSection } from '../variables/variables-section';
import styles from './console.module.scss';
import type { GameDetailsData } from './game-details-pane';
import { GameDetailsPane } from './game-details-pane';
import { ModeratorsPane } from './moderators-pane';
import type { NavItemId } from './nav-model';

export interface ContentRouterProps {
    activeItem: NavItemId | null;
    game: ResolvedGame;
    categories: Array<{ id: number; display: string }>;
    selectedCategory: ResolvedCategory | null;
    canEditStandards: boolean;
    attentionItems: AttentionItem[];
    degradedSources: string[];
    modApplications?: BoardClaimRequest[];
    moderators?: GameModerator[];
    /** Live item-count reporter from NeedsAttention, forwarded to the sidebar badge. */
    onAttentionCountChange?: (count: number) => void;
    initialSlug: string | null;
    initialAbbreviation: string | null;
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
        selectedCategory,
        canEditStandards,
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
        case 'standards':
            return selectedCategory ? (
                <Standards
                    gameSlug={game.name}
                    gameDisplay={game.display}
                    category={selectedCategory}
                    canEdit={canEditStandards}
                />
            ) : (
                <Placeholder title="Minimum time">Pick a category.</Placeholder>
            );
        case 'timing':
            return selectedCategory ? (
                <TimingSettingsSection
                    gameSlug={game.name}
                    gameId={game.id}
                    category={selectedCategory}
                />
            ) : (
                <Placeholder title="Timing">Pick a category.</Placeholder>
            );
        case 'rules':
            return selectedCategory ? (
                <RulesSection
                    gameSlug={game.name}
                    gameId={game.id}
                    category={selectedCategory}
                />
            ) : (
                <Placeholder title="Rules">Pick a category.</Placeholder>
            );
        case 'variables':
            return selectedCategory ? (
                <VariablesSection
                    gameSlug={game.name}
                    gameId={game.id}
                    selectedCategory={selectedCategory}
                />
            ) : (
                <Placeholder title="Variables">Pick a category.</Placeholder>
            );
        case 'combinations':
            return selectedCategory ? (
                <CombinationsSection
                    gameSlug={game.name}
                    gameId={game.id}
                    selectedCategory={selectedCategory}
                />
            ) : (
                <Placeholder title="Sub-boards">Pick a category.</Placeholder>
            );
        case 'category-settings':
            return selectedCategory ? (
                <CategorySettingsSection
                    gameSlug={game.name}
                    gameId={game.id}
                    category={selectedCategory}
                />
            ) : (
                <Placeholder title="Category settings">
                    Pick a category.
                </Placeholder>
            );
        // All three items live inside the single GameTab component — it
        // scrolls to the matching section rather than remounting.
        case 'groups':
        case 'categories-visibility':
        case 'identifiers':
            return (
                <GameTab
                    game={game}
                    activeSection={activeItem}
                    initialSlug={props.initialSlug}
                    initialAbbreviation={props.initialAbbreviation}
                    rows={props.rows}
                    groups={props.groups}
                    onGroupsChange={props.onGroupsChange}
                    onRowChange={props.onRowChange}
                    onRowGroupChange={props.onRowGroupChange}
                    onEditCategory={props.onEditCategory}
                />
            );
        case 'game-details':
            return props.gameDetails ? (
                <GameDetailsPane
                    identifiers={props.gameDetails.identifiers}
                    metadata={props.gameDetails.metadata}
                    game={props.gameDetails.game}
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
                    selectedCategory={
                        selectedCategory
                            ? {
                                  id: selectedCategory.id,
                                  display: selectedCategory.display,
                              }
                            : null
                    }
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
