'use client';

import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import type { ClaimCtaState } from '../claim/claim-cta';
import { FilterBar } from '../filters/filter-bar';
import { FiltersPopover } from '../filters/filters-popover';
import { VerifiedToggle } from '../filters/verified-toggle';
import gamePageStyles from '../game-page.module.scss';
import { RulesPanel } from '../rules/rules-panel';
import type { GamePageData } from '../types';
import { effectiveSubcategoryLabel } from './board-identity';
import { CategoryRail } from './category-rail';
import { GameHero } from './game-hero';
import styles from './masthead.module.scss';
import { StickyBoardBar } from './sticky-board-bar';

interface Props {
    data: GamePageData;
    canManage: boolean;
    canManageRuns: boolean;
    claim?: ClaimCtaState | null;
    back?: { href: string; label: string };
    /** The board's active subcategory key, used for submit-link context only — never displayed. */
    subcategoryKey: string;
    rulesOpen: boolean;
    onToggleRules: () => void;
    onOpenHistory: () => void;
}

export function BoardMasthead({
    data,
    canManage,
    canManageRuns,
    claim,
    back,
    subcategoryKey,
    rulesOpen,
    onToggleRules,
    onOpenHistory,
}: Props) {
    const category = data.selectedCategory;
    const suffix = effectiveSubcategoryLabel(
        data.variables,
        data.activeFilters.subcategoryValues,
    );
    const boardName = suffix
        ? `${category.display} · ${suffix}`
        : category.display;
    const wr = data.wrEntry;
    const variableKeys = data.variables.map((v) => v.nameNormalized);

    return (
        <>
            <div className={styles.plate}>
                <div className={styles.plateTop}>
                    <GameHero
                        variant="condensed"
                        game={data.game}
                        stats={data.quickStats}
                        gameMeta={data.gameMeta}
                        categorySlug={category.name}
                        subcategoryKey={subcategoryKey}
                        canManage={canManage}
                        canModerate={canManageRuns}
                        claim={claim}
                        back={back}
                    />
                    <div className={styles.boardLine}>
                        <div>
                            {category.groupName && (
                                <span className={styles.groupEyebrow}>
                                    {category.groupName}
                                </span>
                            )}
                            <h1 className={styles.boardTitle}>
                                {category.display}
                                {suffix && (
                                    <span className={styles.boardTitleSuffix}>
                                        {' · '}
                                        {suffix}
                                    </span>
                                )}
                            </h1>
                            <p className={styles.boardMeta}>
                                {data.leaderboard.totalItems.toLocaleString()}{' '}
                                runs on this board
                            </p>
                        </div>
                        {wr?.time != null && (
                            <div className={styles.record}>
                                <span className={styles.groupEyebrow}>
                                    World record
                                </span>
                                <span className={styles.recordTime}>
                                    <DurationToFormatted
                                        duration={wr.time}
                                        withMillis={
                                            category.showMilliseconds ?? true
                                        }
                                    />
                                </span>
                                <span className={styles.recordHolder}>
                                    {wr.isGuest ? (
                                        wr.runnerName
                                    ) : (
                                        <UserLink username={wr.runnerName} />
                                    )}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.railZone}>
                    <CategoryRail
                        categories={data.categories}
                        groups={data.groups}
                        selectedCategoryName={category.name}
                        variableKeys={variableKeys}
                    />
                    <FilterBar
                        defs={data.variables}
                        selectedSubcategoryValues={
                            data.activeFilters.subcategoryValues
                        }
                        selectedVarFilters={data.activeFilters.varFilters}
                    />
                    <div className={styles.utilities}>
                        <VerifiedToggle
                            verified={data.activeFilters.verified}
                        />
                        <span className={styles.utilitySep} aria-hidden />
                        <FiltersPopover
                            defs={data.variables}
                            selectedVarFilters={data.activeFilters.varFilters}
                        />
                        <span className={styles.utilitySep} aria-hidden />
                        <RulesPanel
                            rules={category.rules}
                            open={rulesOpen}
                            onToggle={onToggleRules}
                        />
                        <span className={styles.utilitySep} aria-hidden />
                        <button
                            type="button"
                            className={gamePageStyles.quietLink}
                            onClick={onOpenHistory}
                        >
                            WR history
                        </button>
                    </div>
                </div>
            </div>
            <StickyBoardBar
                coverUrl={data.gameMeta.coverUrl ?? data.game.image ?? null}
                gameDisplay={data.game.display}
                boardName={boardName}
                verified={data.activeFilters.verified}
                defs={data.variables}
                selectedVarFilters={data.activeFilters.varFilters}
                onOpenHistory={onOpenHistory}
            />
        </>
    );
}
