'use client';

import { useMemo } from 'react';
import styles from '../setup.module.scss';
import type { StepProps } from '../types';
import { buildCategorySeed } from './category-seed';
import type { ExistingLevels } from './level-plan';
import { LevelsEditor } from './levels-editor';
import { StepHeader } from './step-header';

export function StepLevels({ data, onAdvance }: StepProps) {
    // Same seed the feature-on path in step-categories.tsx uses: a newly
    // Featured category shouldn't land on the board with no timing.
    const seed = useMemo(
        () => buildCategorySeed(data.metadata),
        [data.metadata],
    );

    const existing: ExistingLevels = useMemo(() => {
        const levelGroupIds = new Set(
            data.groups.filter((g) => g.kind === 'level').map((g) => g.id),
        );
        const instances = data.categories.filter(
            (c) => c.groupId != null && levelGroupIds.has(c.groupId),
        );
        const levelGroups = data.groups
            .filter((g) => g.kind === 'level')
            .map((g) => ({
                id: g.id,
                name: g.name,
                rules: g.rules ?? null,
                hasLevelOnlyBoard: instances.some(
                    (c) =>
                        c.groupId === g.id &&
                        !c.archived &&
                        c.levelTemplateId == null,
                ),
            }));
        const templates = data.levelTemplates.map((t) => ({
            id: t.id,
            display: t.display,
        }));
        // Excluded = archived by the level (override + inactive); overridden
        // = detached but live. Same reading as the backend's instanceState.
        const exclusions = instances
            .filter(
                (c) =>
                    c.levelTemplateId != null && c.archived && c.levelOverride,
            )
            .map((c) => ({
                groupId: c.groupId as number,
                templateId: c.levelTemplateId as number,
            }));
        const overriddenCategoryIds = instances
            .filter(
                (c) =>
                    c.levelTemplateId != null && !c.archived && c.levelOverride,
            )
            .map((c) => c.id);
        const needsMaterialise = [...levelGroupIds].some((gid) =>
            templates.some(
                (t) =>
                    !instances.some(
                        (c) => c.groupId === gid && c.levelTemplateId === t.id,
                    ),
            ),
        );
        return {
            levelGroups,
            templates,
            categories: data.categories
                .filter((c) => !c.archived && c.groupId == null)
                .map((c) => ({ id: c.id, name: c.name })),
            exclusions,
            overriddenCategoryIds,
            needsMaterialise,
        };
    }, [data.groups, data.categories, data.levelTemplates]);

    return (
        <section>
            <StepHeader
                step="levels"
                title="Does this game have individual levels?"
            />
            <div className={styles.stepBody}>
                <LevelsEditor
                    mode="setup"
                    gameSlug={data.game.name}
                    gameId={data.game.id}
                    seed={seed}
                    existing={existing}
                    onSaved={onAdvance}
                    onSkip={onAdvance}
                />
            </div>
        </section>
    );
}
