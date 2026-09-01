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
 * One level: its name, its rules, and the checklist of level categories that
 * do (or deliberately don't) get a board on it. The checklist is the whole
 * point of the row — a level's boards are materialised from the templates, so
 * the only per-level decision is which templates it opts out of.
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
    const levelOnly = level.instances.filter((i) => i.state === 'level-only');
    const overridden = level.instances.filter((i) => i.state === 'overridden');

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
                <input
                    className={`form-control form-control-sm ${styles.nameInput}`}
                    aria-label={`Name of ${level.name}`}
                    value={name}
                    disabled={isPending}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={saveName}
                />
                <span className={styles.count}>
                    {
                        level.instances.filter((i) => i.state !== 'excluded')
                            .length
                    }{' '}
                    boards
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

            <div className={styles.checklist}>
                {templates.map((t) => {
                    const instance = instanceFor(t.id);
                    const on =
                        instance != null && instance.state !== 'excluded';
                    return (
                        <label key={t.id} className={styles.check}>
                            <input
                                type="checkbox"
                                className="form-check-input"
                                aria-label={`${t.display} on ${level.name}`}
                                checked={on}
                                disabled={isPending}
                                onChange={() => toggleTemplate(t.id, on)}
                            />
                            {t.display}
                        </label>
                    );
                })}
            </div>

            {(overridden.length > 0 || levelOnly.length > 0) && (
                <ul className={styles.instanceList}>
                    {overridden.map((i) => (
                        <li key={i.categoryId} className={styles.instanceRow}>
                            <Link href={categoryHref(i.categoryId)}>
                                {i.display}
                            </Link>
                            <span
                                className={`${styles.pill} ${styles.pillOverridden}`}
                            >
                                edited here
                            </span>
                            <button
                                type="button"
                                className={styles.pillAction}
                                aria-label={`Resync ${i.display} on ${level.name}`}
                                disabled={isPending}
                                onClick={() => resync(i.categoryId)}
                            >
                                Resync
                            </button>
                        </li>
                    ))}
                    {levelOnly.map((i) => (
                        <li key={i.categoryId} className={styles.instanceRow}>
                            <Link href={categoryHref(i.categoryId)}>
                                {i.display}
                            </Link>
                            <span
                                className={`${styles.pill} ${styles.pillLevelOnly}`}
                            >
                                only on this level
                            </span>
                        </li>
                    ))}
                </ul>
            )}

            <InlineError>{error}</InlineError>
        </div>
    );
}
