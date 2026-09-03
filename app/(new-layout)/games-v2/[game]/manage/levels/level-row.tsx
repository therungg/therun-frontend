'use client';

import { useState } from 'react';
import { levelOpAction } from '~src/actions/levels/level-op.action';
import { updateLevelAction } from '~src/actions/levels/update-level.action';
import Link from '~src/components/link';
import type { LevelOverview } from '../../../../../../types/levels.types';
import { InlineError } from '../shared/form-kit';
import kit from '../shared/form-kit.module.scss';
import styles from './levels.module.scss';
import { useActionRunner } from './use-level-overview';

type Level = LevelOverview['levels'][number];
type TemplateSummary = LevelOverview['templates'][number];

interface Props {
    gameId: number;
    gameSlug: string;
    level: Level;
    templates: TemplateSummary[];
    /** Reload the overview after a write that changes what the board holds. */
    onChanged: () => void;
}

/**
 * One level: its name, its rules, and the boards it carries. A level's
 * boards are materialised from the shared level templates, so the row's
 * whole job is showing — per board — whether it's on, whether it matches the
 * shared template or was customized away from it, and letting the moderator
 * flip it or restore it.
 */
export function LevelRow({
    gameId,
    gameSlug,
    level,
    templates,
    onChanged,
}: Props) {
    const [name, setName] = useState(level.name);
    const [rulesOpen, setRulesOpen] = useState(false);
    const [rules, setRules] = useState(level.rules ?? '');
    const [error, setError] = useState<string | null>(null);
    // A rejected rename/rules save leaves the inputs holding text the server
    // never took. Putting the server's values back with the message means the
    // row always shows what the level actually is — the moderator can retry
    // from a true starting point instead of from a fiction.
    const reportError = (message: string | null) => {
        setError(message);
        if (message !== null) {
            setName(level.name);
            setRules(level.rules ?? '');
        }
    };
    const { isPending, run } = useActionRunner(reportError, onChanged);

    const instanceFor = (templateId: number) =>
        level.instances.find((i) => i.templateId === templateId) ?? null;
    // Boards with no template of their own — templates.map() below never
    // reaches these, so they get their own pass.
    const levelOnly = level.instances.filter((i) => i.state === 'level-only');
    const boardCount = level.instances.filter(
        (i) => i.state !== 'excluded',
    ).length;

    const saveName = () => {
        const trimmed = name.trim();
        if (!trimmed || trimmed === level.name) return;
        run(() =>
            updateLevelAction({
                gameSlug,
                gameId,
                groupId: level.id,
                name: trimmed,
            }),
        );
    };

    const saveRules = () =>
        run(() =>
            updateLevelAction({
                gameSlug,
                gameId,
                groupId: level.id,
                rules: rules.trim() === '' ? null : rules,
            }),
        );

    const toggleTemplate = (templateId: number, excluded: boolean) =>
        run(() =>
            levelOpAction({
                gameSlug,
                gameId,
                op: {
                    op: 'level-exclusion',
                    groupId: level.id,
                    templateId,
                    excluded,
                },
            }),
        );

    const resync = (categoryId: number) =>
        run(() =>
            levelOpAction({
                gameSlug,
                gameId,
                op: { op: 'level-resync', categoryId },
            }),
        );

    const categoryHref = (categoryId: number) =>
        `/games-v2/${encodeURIComponent(gameSlug)}/manage/category/${categoryId}`;

    return (
        <div className={styles.levelRow}>
            <div className={styles.levelHead}>
                <span className={styles.levelMark}>Level</span>
                <input
                    className={`form-control form-control-sm ${styles.nameInput}`}
                    aria-label={`Name of ${level.name}`}
                    value={name}
                    disabled={isPending}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={saveName}
                />
                <span className={styles.count}>
                    {boardCount} board{boardCount === 1 ? '' : 's'}
                </span>
                <button
                    type="button"
                    className={styles.rulesToggle}
                    aria-expanded={rulesOpen}
                    onClick={() => setRulesOpen((o) => !o)}
                >
                    {rulesOpen ? 'Hide rules' : 'Rules'}
                </button>
            </div>

            {rulesOpen && (
                <div className={styles.rulesBox}>
                    <textarea
                        className={`form-control form-control-sm ${styles.rulesInput}`}
                        aria-label={`Rules for ${level.name}`}
                        rows={3}
                        value={rules}
                        disabled={isPending}
                        onChange={(e) => setRules(e.target.value)}
                    />
                    <div>
                        <button
                            type="button"
                            className={kit.saveBtn}
                            disabled={isPending}
                            onClick={saveRules}
                        >
                            Save rules
                        </button>
                    </div>
                </div>
            )}

            <div className={styles.boards}>
                <div className={styles.boardsLabel}>Boards on this level</div>

                {templates.map((t) => {
                    const instance = instanceFor(t.id);
                    const on =
                        instance != null && instance.state !== 'excluded';
                    const customized = on && instance?.state === 'overridden';

                    return (
                        <div
                            key={t.id}
                            className={`${styles.board} ${on ? '' : styles.boardOff}`}
                        >
                            <button
                                type="button"
                                role="switch"
                                aria-checked={on}
                                aria-label={`${t.display} on ${level.name}`}
                                disabled={isPending}
                                className={styles.boardToggle}
                                onClick={() => toggleTemplate(t.id, on)}
                            />
                            <span className={styles.boardName}>
                                <strong>{t.display}</strong> board
                            </span>
                            <span
                                className={`${styles.chip} ${
                                    !on
                                        ? styles.chipOff
                                        : customized
                                          ? styles.chipCustom
                                          : styles.chipDefault
                                }`}
                            >
                                {!on
                                    ? 'Off'
                                    : customized
                                      ? 'Customized'
                                      : 'Default'}
                            </span>
                            <span className={styles.boardActions}>
                                {customized && instance != null && (
                                    <button
                                        type="button"
                                        className={styles.resyncAction}
                                        aria-label={`Restore ${t.display} on ${level.name} to the template`}
                                        disabled={isPending}
                                        onClick={() =>
                                            resync(instance.categoryId)
                                        }
                                    >
                                        Restore to template
                                    </button>
                                )}
                                {instance?.categoryId != null && (
                                    <Link
                                        className={styles.editAction}
                                        href={categoryHref(instance.categoryId)}
                                    >
                                        Edit
                                    </Link>
                                )}
                            </span>
                        </div>
                    );
                })}

                {levelOnly.map((i) => (
                    <div key={i.categoryId} className={styles.board}>
                        <span
                            className={styles.boardToggleSpacer}
                            aria-hidden="true"
                        />
                        <span className={styles.boardName}>{i.display}</span>
                        <span className={`${styles.chip} ${styles.chipOnly}`}>
                            Only on this level
                        </span>
                        <span className={styles.boardActions}>
                            <Link
                                className={styles.editAction}
                                href={categoryHref(i.categoryId)}
                            >
                                Edit
                            </Link>
                        </span>
                    </div>
                ))}
            </div>

            <InlineError>{error}</InlineError>
        </div>
    );
}
