'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CONCEPT_LABEL } from '~src/lib/console/vocabulary';
import type {
    ResolvedCategory,
    ResolvedGame,
    VariableRow,
} from '../../../../../../types/leaderboards.types';
import type { BoardPolicyRow } from '../../../../../../types/moderation.types';
import { CategorySettingsSection } from '../category-tab/category-settings-section';
import { RulesSection } from '../category-tab/rules-section';
import { Standards } from '../moderation/configure/standards';
import {
    type GameTimingDefaults,
    TimingSettingsSection,
} from '../timing/timing-settings-section';
import { VariablesSection } from '../variables/variables-section';
import styles from './category-editor.module.scss';
import { CopyFromControl } from './copy-from-control';

export interface CopySources {
    categories: ResolvedCategory[];
    variables: VariableRow[];
    policies: BoardPolicyRow[];
}

interface Props {
    game: ResolvedGame;
    category: ResolvedCategory;
    canConfigure: boolean;
    canModerate: boolean;
    canEditStandards: boolean;
    context: 'console' | 'wizard';
    /** All featured categories + game variables/policies, for the "Copy
     *  from…" control. Omitted callers simply don't get the control — it
     *  renders only when this is provided AND the moderator can configure. */
    copySources?: CopySources;
    /** Game-wide timing defaults, for the Timing section's "matches the game
     *  default?" caption. Optional — mounts without metadata skip the caption. */
    gameTimingDefaults?: GameTimingDefaults;
}

/**
 * Section order is the reader's job order, basics first: what every category
 * needs to be presentable (timing, rules, minimum, settings), then the
 * advanced structure most categories never touch. Sub-boards is no longer a
 * section of its own — it renders inside the variables section, as the
 * consequence of the subcategory variables it belongs to.
 */
const SECTIONS = [
    { id: 'timing', requires: 'configure' },
    { id: 'rules', requires: 'configure' },
    // Minimum time is visible to ANY moderator — this is the carve-out that
    // used to live in nav-model's itemVisible for the `standards` nav item.
    { id: 'standards', requires: 'moderate' },
    { id: 'category-settings', requires: 'configure' },
    { id: 'variables', requires: 'configure' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

export function CategoryEditor({
    game,
    category,
    canConfigure,
    canModerate,
    canEditStandards,
    context,
    copySources,
    gameTimingDefaults,
}: Props) {
    const visible = useMemo(
        () =>
            SECTIONS.filter((s) =>
                s.requires === 'moderate' ? canModerate : canConfigure,
            ),
        [canConfigure, canModerate],
    );

    const [current, setCurrent] = useState<SectionId | null>(
        visible[0]?.id ?? null,
    );
    const refs = useRef(new Map<SectionId, HTMLElement>());

    // Highlight the section the reader is actually in. rootMargin pins the
    // trigger line near the top of the viewport so the rail advances when a
    // heading reaches it, not when the section happens to be centred.
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                const hit = entries
                    .filter((e) => e.isIntersecting)
                    .sort(
                        (a, b) =>
                            a.boundingClientRect.top - b.boundingClientRect.top,
                    )[0];
                if (hit?.target instanceof HTMLElement) {
                    const id = hit.target.dataset.section as
                        | SectionId
                        | undefined;
                    if (id) setCurrent(id);
                }
            },
            { rootMargin: '-80px 0px -70% 0px', threshold: 0 },
        );
        for (const el of refs.current.values()) observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const body: Record<SectionId, React.ReactNode> = {
        variables: (
            <VariablesSection
                gameSlug={game.name}
                gameId={game.id}
                mode="category"
                selectedCategory={category}
                sharedHref={
                    context === 'wizard'
                        ? `/games-v2/${game.name}/setup?step=variables`
                        : `/games-v2/${game.name}/manage?pane=variables`
                }
            />
        ),
        timing: (
            <TimingSettingsSection
                gameSlug={game.name}
                gameId={game.id}
                category={category}
                gameDefaults={gameTimingDefaults}
            />
        ),
        standards: (
            <Standards
                gameSlug={game.name}
                gameDisplay={game.display}
                category={category}
                canEdit={canEditStandards}
            />
        ),
        rules: (
            <RulesSection
                gameSlug={game.name}
                gameId={game.id}
                category={category}
            />
        ),
        'category-settings': (
            <CategorySettingsSection
                gameSlug={game.name}
                gameId={game.id}
                category={category}
            />
        ),
    };

    return (
        <div data-context={context}>
            {copySources && canConfigure && (
                <div className={styles.headerRow}>
                    <CopyFromControl
                        gameSlug={game.name}
                        gameId={game.id}
                        target={category}
                        categories={copySources.categories}
                        variables={copySources.variables}
                        policies={copySources.policies}
                    />
                </div>
            )}
            {/* The wizard already draws its own 16rem step rail — a second
                sticky vertical nav beside it read as a broken layout. In
                wizard context the section nav is a horizontal chip row above
                the sections instead (the same shape the narrow-viewport
                breakpoint produces). */}
            <div
                className={
                    context === 'wizard' ? styles.bodyStacked : styles.body
                }
            >
                <nav
                    className={
                        context === 'wizard' ? styles.railRow : styles.rail
                    }
                    aria-label="Sections"
                >
                    {visible.map((s) => (
                        <a
                            key={s.id}
                            href={`#${s.id}`}
                            className={
                                current === s.id
                                    ? styles.railCurrent
                                    : undefined
                            }
                            aria-current={current === s.id ? 'true' : undefined}
                        >
                            {CONCEPT_LABEL[s.id]}
                        </a>
                    ))}
                </nav>

                <div className={styles.sections}>
                    {visible.map((s) => (
                        <section
                            key={s.id}
                            id={s.id}
                            data-section={s.id}
                            // Focusable so an in-page anchor lands focus here
                            // for keyboard and screen-reader users.
                            tabIndex={-1}
                            className={styles.section}
                            ref={(el) => {
                                if (el) refs.current.set(s.id, el);
                                else refs.current.delete(s.id);
                            }}
                        >
                            {body[s.id]}
                        </section>
                    ))}
                </div>
            </div>
        </div>
    );
}
