import Link from '~src/components/link';
import type { ResolvedGroup } from '../../../../../types/leaderboards.types';
import { sortCategoriesForDisplay } from '../category-sort';
import type { ClaimCtaState } from '../claim/claim-cta';
import gamePageStyles from '../game-page.module.scss';
import { GameHero } from '../header/game-hero';
import { Sidebar } from '../sidebar/sidebar';
import { CategoryCard } from './category-card';
import type { GameOverviewData } from './data';
import styles from './overview.module.scss';

interface Props {
    data: GameOverviewData;
    canManage: boolean;
    canModerate: boolean;
    claim?: ClaimCtaState | null;
}

interface CardSection {
    key: string;
    name: string | null;
    cards: GameOverviewData['cards'];
}

// Cards' own order isn't guaranteed to reflect category sortOrder — sort
// explicitly (unset last, playtime tiebreak) rather than trusting API order.
function byCategoryOrder(
    arr: GameOverviewData['cards'],
): GameOverviewData['cards'] {
    return sortCategoriesForDisplay(
        arr.map((card) => ({
            card,
            sortOrder: card.category.sortOrder,
            totalRunTime: card.category.totalRunTime,
        })),
    ).map((x) => x.card);
}

// Group sections in group sortOrder, ungrouped trailing — the same
// ordering vocabulary as the board page's pill band.
function sectionize(
    cards: GameOverviewData['cards'],
    groups: ResolvedGroup[],
): CardSection[] {
    const byGroup = new Map<number, GameOverviewData['cards']>();
    const ungrouped: GameOverviewData['cards'] = [];
    for (const card of cards) {
        const gid = card.category.groupId ?? null;
        if (gid == null) ungrouped.push(card);
        else {
            const arr = byGroup.get(gid) ?? [];
            arr.push(card);
            byGroup.set(gid, arr);
        }
    }
    const sections: CardSection[] = [];
    for (const g of groups) {
        const arr = byGroup.get(g.id);
        if (arr?.length) {
            sections.push({
                key: `g${g.id}`,
                name: g.name,
                cards: byCategoryOrder(arr),
            });
        }
    }
    if (ungrouped.length > 0) {
        sections.push({
            key: 'ungrouped',
            name: null,
            cards: byCategoryOrder(ungrouped),
        });
    }
    // Single unlabeled section: skip headers entirely.
    if (sections.length === 1) sections[0].name = null;
    return sections;
}

export function GameOverviewPage({
    data,
    canManage,
    canModerate,
    claim,
}: Props) {
    const sections = sectionize(data.cards, data.groups);

    return (
        <div>
            <GameHero
                game={data.game}
                stats={data.quickStats}
                gameMeta={data.gameMeta}
                categorySlug={null}
                subcategoryKey=""
                canManage={canManage}
                canModerate={canModerate}
                claim={claim}
            />
            <div className={gamePageStyles.grid}>
                <div className={gamePageStyles.colMain}>
                    {data.cards.length === 0 ? (
                        <div className={styles.emptyState}>
                            <p className={styles.emptyTitle}>
                                No leaderboards configured yet.
                            </p>
                            <p className={styles.emptyBody}>
                                {canManage || canModerate
                                    ? 'Mark categories as Featured in the console to publish their boards.'
                                    : 'This game has no featured leaderboards yet.'}
                            </p>
                            {(canManage || canModerate) && (
                                <Link
                                    href={`/games-v2/${data.game.name}/manage`}
                                    className={gamePageStyles.primaryAction}
                                >
                                    Open the console
                                </Link>
                            )}
                        </div>
                    ) : (
                        sections.map((s) => (
                            <section key={s.key} className={styles.section}>
                                {s.name && (
                                    <h2 className={styles.sectionTitle}>
                                        {s.name}
                                    </h2>
                                )}
                                <div className={styles.cardGrid}>
                                    {s.cards.map((card) => (
                                        <CategoryCard
                                            key={card.category.id}
                                            gameSlug={data.game.name}
                                            card={card}
                                        />
                                    ))}
                                </div>
                            </section>
                        ))
                    )}
                </div>
                <aside className={gamePageStyles.rail}>
                    <Sidebar
                        game={data.game}
                        yourRuns={data.yourRuns}
                        recentPbs={data.recentPbs}
                        claim={claim}
                    />
                </aside>
            </div>
        </div>
    );
}
