'use client';

import { useState, useTransition } from 'react';
import { CaretDownFill, CaretRightFill } from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import type {
    VerificationSettingsView,
    VideoRule,
} from '../../../../../../../types/verification-settings.types';
import { InlineError } from '../../shared/form-kit';
import { saveVerificationSettingsAction } from './actions/verification-settings.action';
import styles from './board-settings.module.scss';
import { SettingsEditor } from './settings-editor';
import { formatDuration } from './settings-model';

type BoardRow = VerificationSettingsView['categories'][number];

interface Props {
    gameSlug: string;
    view: VerificationSettingsView;
    onSaved: (view: VerificationSettingsView) => void;
}

/**
 * The same three settings, per board.
 *
 * A game's boards are not one thing: a full-game category and a level are held
 * to different times, and the VOD a 1:39:00 run owes is not the one a 9-minute
 * level owes. The game settings above are the default; a row here is a board
 * that answers differently, and a board with nothing of its own keeps
 * following the game.
 *
 * The full-game categories are the list; the levels are a game's long tail —
 * eighty rows that bury three — so they sit behind one heading you open.
 */
export function BoardSettings({ gameSlug, view, onSaved }: Props) {
    const [openId, setOpenId] = useState<number | null>(null);
    const [query, setQuery] = useState('');
    const [levelsOpen, setLevelsOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [clearing, startClear] = useTransition();

    const open = view.categories.find((c) => c.categoryId === openId) ?? null;

    const clearOverrides = (categoryId: number, display: string) => {
        setError(null);
        startClear(async () => {
            const res = await saveVerificationSettingsAction(gameSlug, {
                categoryId,
                intake: null,
                videoRule: null,
                autoVerify: null,
            });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            toast.success(`${display} follows the game settings again.`);
            onSaved(res.view);
        });
    };

    if (open) {
        return (
            <section className={styles.detail}>
                <div className={styles.head}>
                    <div>
                        <div className={styles.eyebrow}>
                            {open.group?.kind === 'level' ? 'Level' : 'Board'}
                        </div>
                        <h3 className={styles.title}>{open.display}</h3>
                    </div>
                    <div className={styles.headActions}>
                        {open.overridden.length > 0 && (
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                disabled={clearing}
                                onClick={() =>
                                    clearOverrides(
                                        open.categoryId,
                                        open.display,
                                    )
                                }
                            >
                                {clearing
                                    ? 'Clearing…'
                                    : 'Use the game settings'}
                            </button>
                        )}
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => setOpenId(null)}
                        >
                            All boards
                        </button>
                    </div>
                </div>
                <p className={styles.note}>
                    Only what you change here stops following the game.
                </p>
                <InlineError>{error}</InlineError>
                <SettingsEditor
                    key={`cat:${open.categoryId}`}
                    gameSlug={gameSlug}
                    categoryId={open.categoryId}
                    effective={open.effective}
                    enforced={view.enforced}
                    configured
                    onSaved={onSaved}
                />
            </section>
        );
    }

    const needle = query.trim().toLowerCase();
    const matches = (c: BoardRow) =>
        !needle || c.display.toLowerCase().includes(needle);

    const categoryGroups = groupBoards(
        view.categories.filter((c) => c.group?.kind !== 'level' && matches(c)),
    );
    const levelRows = view.categories.filter(
        (c) => c.group?.kind === 'level' && matches(c),
    );
    const levelGroups = groupBoards(levelRows);
    const levelsDiffer = levelRows.filter(
        (c) => c.overridden.length > 0,
    ).length;
    // A search is an answer, not a place to look: it opens what it found.
    const showLevels = levelsOpen || !!needle;

    const total = view.categories.length;
    const overriddenCount = view.categories.filter(
        (c) => c.overridden.length > 0,
    ).length;

    return (
        <section className={styles.panel}>
            <div className={styles.head}>
                <div>
                    <h3 className={styles.title}>Per board</h3>
                    <span className={styles.hint}>
                        {overriddenCount === 0
                            ? `all ${total.toLocaleString()} boards follow the game`
                            : `${overriddenCount.toLocaleString()} of ${total.toLocaleString()} boards answer differently`}
                    </span>
                </div>
                <input
                    type="search"
                    className={`form-control form-control-sm ${styles.search}`}
                    placeholder="Find a board"
                    aria-label="Find a board"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
            </div>
            <InlineError>{error}</InlineError>

            {categoryGroups.length > 0 && (
                <BoardTable
                    groups={categoryGroups}
                    labelGroups={categoryGroups.length > 1}
                    onOpen={setOpenId}
                />
            )}

            {levelRows.length > 0 && (
                <div className={styles.levels}>
                    <button
                        type="button"
                        className={styles.levelsToggle}
                        aria-expanded={showLevels}
                        onClick={() => setLevelsOpen((v) => !v)}
                    >
                        {showLevels ? (
                            <CaretDownFill size={10} aria-hidden />
                        ) : (
                            <CaretRightFill size={10} aria-hidden />
                        )}
                        <span className={styles.levelsName}>Levels</span>
                        <span className={styles.levelsCount}>
                            {levelRows.length.toLocaleString()}
                            {levelsDiffer > 0
                                ? ` · ${levelsDiffer.toLocaleString()} differ`
                                : ' · all follow the game'}
                        </span>
                    </button>
                    {showLevels && (
                        <BoardTable
                            groups={levelGroups}
                            labelGroups={levelGroups.length > 1}
                            onOpen={setOpenId}
                        />
                    )}
                </div>
            )}

            {categoryGroups.length === 0 && levelRows.length === 0 && (
                <div className={styles.empty}>No board matches that.</div>
            )}
        </section>
    );
}

type BoardGroup = { key: string; name: string; rows: BoardRow[] };

/** Boards in the order the API sent them, clustered by their category group. */
function groupBoards(rows: BoardRow[]): BoardGroup[] {
    const groups: BoardGroup[] = [];
    const byKey = new Map<string, BoardGroup>();
    for (const row of rows) {
        const key = row.group ? `g${row.group.id}` : 'ungrouped';
        let group = byKey.get(key);
        if (!group) {
            group = { key, name: row.group?.name ?? 'Categories', rows: [] };
            byKey.set(key, group);
            groups.push(group);
        }
        group.rows.push(row);
    }
    return groups;
}

function BoardTable({
    groups,
    labelGroups,
    onOpen,
}: {
    groups: BoardGroup[];
    /** A single group needs no heading — the section it sits in is its name. */
    labelGroups: boolean;
    onOpen: (categoryId: number) => void;
}) {
    return (
        <div className={styles.scroller}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>Board</th>
                        <th>VOD required</th>
                        <th>Auto-submission</th>
                        <th>Auto-verification</th>
                    </tr>
                </thead>
                {groups.map((group) => (
                    <tbody key={group.key}>
                        {labelGroups && (
                            <tr className={styles.groupRow}>
                                <th scope="colgroup" colSpan={4}>
                                    {group.name}
                                </th>
                            </tr>
                        )}
                        {group.rows.map((c) => (
                            <tr
                                key={c.categoryId}
                                className={styles.boardRow}
                                tabIndex={0}
                                role="button"
                                aria-label={`Edit ${c.display}`}
                                onClick={() => onOpen(c.categoryId)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        onOpen(c.categoryId);
                                    }
                                }}
                            >
                                <td className={styles.name}>{c.display}</td>
                                <td>
                                    <Cell
                                        text={videoRuleLabel(
                                            c.effective.videoRule.value,
                                        )}
                                        own={c.overridden.includes('videoRule')}
                                    />
                                </td>
                                <td>
                                    <Cell
                                        text={
                                            c.effective.intake.value
                                                .timerRuns === 'direct'
                                                ? 'Allowed'
                                                : 'Runner submits'
                                        }
                                        own={c.overridden.includes('intake')}
                                    />
                                </td>
                                <td>
                                    <Cell
                                        text={
                                            c.effective.autoVerify.value.enabled
                                                ? 'On'
                                                : 'Off'
                                        }
                                        own={c.overridden.includes(
                                            'autoVerify',
                                        )}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                ))}
            </table>
        </div>
    );
}

/** A value the board sets itself. A board with no answer of its own shows a
 *  dash rather than repeating the game's answer on every row. */
function Cell({ text, own }: { text: string; own: boolean }) {
    if (!own) {
        return (
            <span
                className={styles.inheritedValue}
                title={`Follows the game: ${text}`}
            >
                —
            </span>
        );
    }
    return <span className={styles.ownValue}>{text}</span>;
}

/** The rule in the words the segmented control uses, with its number. */
export function videoRuleLabel(rule: VideoRule): string {
    switch (rule.require) {
        case 'nothing':
            return 'No';
        case 'everything':
            return 'Every run';
        case 'top_n':
            return `Top ${rule.topN ?? 0}`;
        case 'under_time':
            return `Under ${rule.timeMs ? formatDuration(rule.timeMs) : '—'}`;
    }
}
