'use client';

import type { ReactNode } from 'react';
import Link from '~src/components/link';
import type { ManageCategoryRow, ManageGroup } from '~src/lib/category-mgmt';
import type {
    ResolvedCategory,
    ResolvedGame,
} from '../../../../../../types/leaderboards.types';
import { CategorySettingsSection } from '../category-tab/category-settings-section';
import { RulesSection } from '../category-tab/rules-section';
import { GameTab } from '../game-tab/game-tab';
import type { AttentionItem } from '../moderation/attention/attention-model';
import { NeedsAttention } from '../moderation/attention/needs-attention';
import { ActiveBans } from '../moderation/configure/active-bans';
import { Standards } from '../moderation/configure/standards';
import { TimingSettingsSection } from '../timing/timing-settings-section';
import { CombinationsSection } from '../variables/combinations-section';
import { VariablesSection } from '../variables/variables-section';
import styles from './console.module.scss';
import type { NavItemId } from './nav-model';

export interface ContentRouterProps {
    activeItem: NavItemId | null;
    game: ResolvedGame;
    categories: Array<{ id: number; display: string }>;
    selectedCategory: ResolvedCategory | null;
    canEditStandards: boolean;
    attentionItems: AttentionItem[];
    initialSlug: string | null;
    initialAbbreviation: string | null;
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
    } = props;

    switch (activeItem) {
        case 'attention':
            return (
                <NeedsAttention
                    gameSlug={game.name}
                    gameDisplay={game.display}
                    items={attentionItems}
                    categories={categories}
                />
            );
        case 'bans':
            return <ActiveBans gameSlug={game.name} />;
        case 'roster':
            return (
                <Placeholder title="Roster">
                    <Link
                        href={`/games-v2/${game.name}/manage/moderation/roster`}
                    >
                        Open the roster browser ↗
                    </Link>
                </Placeholder>
            );
        case 'reports':
            return (
                <Placeholder title="Reports">
                    Reports move here in a later phase.
                </Placeholder>
            );
        case 'standards':
            return (
                <Standards
                    gameSlug={game.name}
                    gameDisplay={game.display}
                    categories={categories}
                    canEdit={canEditStandards}
                />
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
                <Placeholder title="Combinations">Pick a category.</Placeholder>
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
        // All three items live inside the single GameTab component.
        case 'groups':
        case 'categories-visibility':
        case 'identifiers':
            return (
                <GameTab
                    game={game}
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
            return (
                <Placeholder title="Details & metadata">
                    Coming in a later phase.
                </Placeholder>
            );
        case 'moderators':
            return (
                <Placeholder title="Moderators">
                    Coming in a later phase.
                </Placeholder>
            );
        default:
            return (
                <Placeholder title="Admin console">
                    Select an item from the sidebar.
                </Placeholder>
            );
    }
}
