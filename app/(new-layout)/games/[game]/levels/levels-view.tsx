'use client';

import { useMemo, useState } from 'react';
import Link from '~src/components/link';
import { buildBoardHref } from '~src/lib/board-url';
import { formatCount } from '~src/utils/format-stats';
import { CategoryCard } from '../overview/category-card';
import overviewStyles from '../overview/overview.module.scss';
import type { LevelsData } from './data';
import styles from './levels.module.scss';

interface Props {
    gameSlug: string;
    data: LevelsData;
    /**
     * What one of these boards is called. The wall is shared with the
     * Category Extensions tab, whose boards are not levels.
     */
    noun?: { one: string; many: string; title: string };
}

const LEVEL_NOUN = { one: 'level', many: 'levels', title: 'Levels' };

/** A game past this many levels gets a filter box; below it the list is the list. */
const FILTER_THRESHOLD = 12;

/** Chips drawn before the tail asks to be opened the rest of the way. */
const CHIP_CAP = 120;

export function LevelsView({ gameSlug, data, noun = LEVEL_NOUN }: Props) {
    const [query, setQuery] = useState('');
    const [showAllChips, setShowAllChips] = useState(false);

    const q = query.trim().toLowerCase();
    const sections = useMemo(() => {
        const hit = (display: string) =>
            !q || display.toLowerCase().includes(q);
        return data.sections
            .map((s) => ({
                ...s,
                cards: s.cards.filter((c) => hit(c.category.display)),
                rest: s.rest.filter((r) => hit(r.display)),
            }))
            .filter((s) => s.cards.length > 0 || s.rest.length > 0);
    }, [data.sections, q]);

    const restCount = sections.reduce((n, s) => n + s.rest.length, 0);
    const chipsCapped = restCount > CHIP_CAP && !showAllChips;
    // One budget across the sections rather than per section, so a game that
    // ever splits its levels into several groups still draws one page's worth.
    let chipBudget = chipsCapped ? CHIP_CAP : Number.POSITIVE_INFINITY;

    const figures: { label: string; value: string; meta: string }[] = [
        {
            label: noun.title,
            value: data.total.toLocaleString(),
            meta: 'on this game',
        },
        {
            label: 'With runs',
            value: data.withRuns.toLocaleString(),
            meta:
                data.withRuns === 0
                    ? 'none yet'
                    : data.withRuns === data.total
                      ? 'all of them'
                      : 'of them ranked',
        },
        {
            label: 'Ranked runs',
            value: formatCount(data.rankedRuns),
            meta: `across every ${noun.one}`,
        },
        ...(data.busiest
            ? [
                  {
                      label: 'Most run',
                      value: data.busiest.display,
                      meta: `${formatCount(data.busiest.entries)} runners`,
                  },
              ]
            : []),
    ];

    return (
        <div className={styles.page}>
            {/* The page's subject in numbers before any list — the same
                anatomy the Races tab opens with. */}
            <section className={styles.panel}>
                <dl className={styles.statStrip}>
                    {figures.map((f) => (
                        <div key={f.label} className={styles.stat}>
                            <dt className={styles.statLabel}>{f.label}</dt>
                            <dd className={styles.statValue}>{f.value}</dd>
                            <p className={styles.statMeta}>{f.meta}</p>
                        </div>
                    ))}
                </dl>
            </section>

            {data.total > FILTER_THRESHOLD && (
                <input
                    type="search"
                    className={`form-control form-control-sm ${styles.filter}`}
                    placeholder={`Find a ${noun.one}…`}
                    aria-label={`Find a ${noun.one}`}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
            )}

            {sections.length === 0 ? (
                <p className={styles.note}>
                    {q
                        ? `No ${noun.one} matches “${query.trim()}”.`
                        : `No ${noun.many} on this game.`}
                </p>
            ) : (
                sections.map((section) => {
                    const rest = section.rest.slice(
                        0,
                        Number.isFinite(chipBudget) ? chipBudget : undefined,
                    );
                    chipBudget -= rest.length;
                    return (
                        <div key={section.id} className={styles.section}>
                            {/* A game has one level group today, so its name
                                would head the whole page and say nothing. The
                                heading appears only once a game splits its
                                levels up. */}
                            {data.sections.length > 1 && (
                                <h2 className={styles.sectionName}>
                                    {section.name}
                                </h2>
                            )}
                            {section.cards.length > 0 && (
                                <div className={overviewStyles.cardGrid}>
                                    {section.cards.map((card, i) => (
                                        <CategoryCard
                                            key={card.category.id}
                                            gameSlug={gameSlug}
                                            card={card}
                                            index={i}
                                        />
                                    ))}
                                </div>
                            )}
                            {rest.length > 0 && (
                                <div className={styles.restBlock}>
                                    {/* Named for what these are, not for what
                                        they lack: they are the rest of the
                                        game, one press from a board. */}
                                    <div className={styles.restHead}>
                                        <span className={styles.eyebrow}>
                                            No runs yet
                                        </span>
                                        <span className={styles.restCount}>
                                            {section.rest.length.toLocaleString()}{' '}
                                            {section.rest.length === 1
                                                ? noun.one
                                                : noun.many}
                                        </span>
                                    </div>
                                    <div className={styles.chips}>
                                        {rest.map((r) => (
                                            <Link
                                                key={r.id}
                                                href={buildBoardHref(gameSlug, {
                                                    categorySlug: r.name,
                                                })}
                                                className={styles.chip}
                                            >
                                                {r.display}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })
            )}

            {chipsCapped && (
                <button
                    type="button"
                    className={styles.moreButton}
                    onClick={() => setShowAllChips(true)}
                >
                    Show all {restCount.toLocaleString()} levels with no runs
                </button>
            )}

            {data.withRuns >= data.probeCap && (
                <p className={styles.note}>
                    Records shown for the first {data.probeCap} levels.
                </p>
            )}
        </div>
    );
}
