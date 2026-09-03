'use client';

import { useMemo, useState } from 'react';
import consoleStyles from '~src/components/console-chrome/console.module.scss';
import type { ExistingLevels } from '../../setup/steps/level-plan';
import { LevelsEditor } from '../../setup/steps/levels-editor';
import { useLevelOverview } from './use-level-overview';

interface Props {
    gameId: number;
    gameSlug: string;
}

/**
 * The wizard's Levels step without the wizard: the same editor, fed by the
 * level overview (the server's reading of which boards exist and how they
 * drifted) and reloaded after every save.
 */
export function LevelsPane({ gameId, gameSlug }: Props) {
    const { overview, loading, error, reload } = useLevelOverview(
        gameSlug,
        gameId,
    );
    // The editor seeds its drafts from `existing` once; a reload remounts it.
    const [version, setVersion] = useState(0);

    const existing: ExistingLevels | null = useMemo(() => {
        if (!overview) return null;
        return {
            levelGroups: overview.levels.map((l) => ({
                id: l.id,
                name: l.name,
                rules: l.rules,
                hasLevelOnlyBoard: l.instances.some(
                    (i) => i.state === 'level-only',
                ),
            })),
            templates: overview.templates.map((t) => ({
                id: t.id,
                display: t.display,
            })),
            // No full-game category adoption here; that is a first-setup
            // convenience the wizard offers.
            categories: [],
            exclusions: overview.levels.flatMap((l) =>
                l.instances
                    .filter(
                        (i) => i.state === 'excluded' && i.templateId != null,
                    )
                    .map((i) => ({
                        groupId: l.id,
                        templateId: i.templateId as number,
                    })),
            ),
            overriddenCategoryIds: overview.levels.flatMap((l) =>
                l.instances
                    .filter((i) => i.state === 'overridden')
                    .map((i) => i.categoryId),
            ),
            needsMaterialise: overview.levels.some((l) =>
                overview.templates.some(
                    (t) => !l.instances.some((i) => i.templateId === t.id),
                ),
            ),
        };
    }, [overview]);

    return (
        <div className={consoleStyles.surface}>
            <div className={consoleStyles.paneHeader}>
                <div>
                    <div className={consoleStyles.paneEyebrow}>Structure</div>
                    <h2 className={consoleStyles.paneTitle}>Levels</h2>
                </div>
            </div>
            {error && <div className="alert alert-danger">{error}</div>}
            {loading && !existing && (
                <p className="text-muted small">Loading levels…</p>
            )}
            {existing && (
                <LevelsEditor
                    key={version}
                    mode="manage"
                    gameSlug={gameSlug}
                    gameId={gameId}
                    existing={existing}
                    onSaved={async () => {
                        await reload();
                        setVersion((v) => v + 1);
                    }}
                />
            )}
        </div>
    );
}
