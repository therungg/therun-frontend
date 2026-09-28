'use client';

import { useEffect, useEffectEvent, useId, useRef, useState } from 'react';
import type { RunnerSuggestion } from '../../../../../../../types/all-runs.types';
import { RunnerAvatar } from '../../../leaderboard/runner-avatar';
import { loadRunnerSuggestionsAction } from '../all-runs/actions/all-runs.action';
import styles from './runner-search.module.scss';

const RUNNER_DEBOUNCE_MS = 300;

/** Local draft, written to the URL after a pause; follows outside changes. */
const SUGGEST_DEBOUNCE_MS = 150;

/** Runner search with suggestions: typing still filters as it goes, and a
 *  picked suggestion applies at once. */
export function RunnerSearch({
    gameSlug,
    value,
    onApply,
}: {
    gameSlug: string;
    value: string;
    onApply: (runner: string) => void;
}) {
    const id = useId();
    const listId = `${id}-list`;
    const [draft, setDraft] = useState(value);
    const [synced, setSynced] = useState(value);
    if (synced !== value) {
        setSynced(value);
        setDraft(value);
    }
    const [focused, setFocused] = useState(false);
    const [suggestions, setSuggestions] = useState<{
        q: string;
        runners: RunnerSuggestion[];
    }>({ q: '', runners: [] });
    const [active, setActive] = useState(-1);
    const [dismissed, setDismissed] = useState(false);
    const seq = useRef(0);

    // Applies against the query current when the pause ends, not when typed.
    const apply = useEffectEvent((runner: string) => onApply(runner));
    useEffect(() => {
        if (draft.trim() === value.trim()) return;
        const t = setTimeout(() => apply(draft), RUNNER_DEBOUNCE_MS);
        return () => clearTimeout(t);
    }, [draft, value]);

    const q = draft.trim();
    useEffect(() => {
        if (q === '' || !focused) return;
        const mine = ++seq.current;
        const t = setTimeout(() => {
            loadRunnerSuggestionsAction(gameSlug, q)
                .then((res) => {
                    if (mine !== seq.current || !('ok' in res)) return;
                    setSuggestions({ q, runners: res.runners });
                    setActive(-1);
                })
                // No suggestions is fine: typing still filters.
                .catch(() => setSuggestions({ q: '', runners: [] }));
        }, SUGGEST_DEBOUNCE_MS);
        return () => clearTimeout(t);
    }, [gameSlug, q, focused]);

    const shown =
        focused && !dismissed && q !== '' && suggestions.q === q
            ? // The one already applied, typed in full, needs no suggestion.
              suggestions.runners.filter(
                  (r) =>
                      !(
                          suggestions.runners.length === 1 &&
                          r.name.toLowerCase() === value.trim().toLowerCase()
                      ),
              )
            : [];
    const open = shown.length > 0;

    const pick = (runner: RunnerSuggestion) => {
        setDraft(runner.name);
        setDismissed(true);
        setActive(-1);
        onApply(runner.name);
    };

    return (
        <div className={styles.search}>
            <label htmlFor={id} className="visually-hidden">
                Runner
            </label>
            <input
                id={id}
                type="search"
                role="combobox"
                aria-expanded={open}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={
                    open && active >= 0 ? `${listId}-${active}` : undefined
                }
                autoComplete="off"
                className={`form-control form-control-sm ${styles.searchInput}`}
                placeholder="Search runner"
                value={draft}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onChange={(e) => {
                    setDraft(e.target.value);
                    setDismissed(false);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'ArrowDown' && open) {
                        e.preventDefault();
                        setActive((i) => (i + 1) % shown.length);
                    } else if (e.key === 'ArrowUp' && open) {
                        e.preventDefault();
                        setActive((i) => (i <= 0 ? shown.length - 1 : i - 1));
                    } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (open && active >= 0) pick(shown[active]);
                        else {
                            setDismissed(true);
                            onApply(draft);
                        }
                    } else if (e.key === 'Escape' && open) {
                        e.preventDefault();
                        setDismissed(true);
                    }
                }}
            />
            {open && (
                <ul id={listId} role="listbox" className={styles.suggestions}>
                    {shown.map((r, i) => (
                        <li
                            key={`${r.userId ?? 'g'}:${r.name}`}
                            id={`${listId}-${i}`}
                            role="option"
                            aria-selected={i === active}
                            className={
                                i === active
                                    ? `${styles.suggestion} ${styles.suggestionActive}`
                                    : styles.suggestion
                            }
                            // mousedown, not click: the input keeps focus and
                            // its blur doesn't close the list first.
                            onMouseDown={(e) => {
                                e.preventDefault();
                                pick(r);
                            }}
                            onMouseEnter={() => setActive(i)}
                        >
                            <RunnerAvatar
                                name={r.name}
                                picture={r.picture}
                                size="xs"
                            />
                            <span className={styles.suggestionName}>
                                <Highlight text={r.name} match={q} />
                                {r.userId == null && (
                                    <span className={styles.suggestionGuest}>
                                        guest
                                    </span>
                                )}
                            </span>
                            <span className={styles.suggestionRuns}>
                                {r.runs.toLocaleString()}{' '}
                                {r.runs === 1 ? 'run' : 'runs'}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

/** The typed part of a name, in bold. */
function Highlight({ text, match }: { text: string; match: string }) {
    const at = text.toLowerCase().indexOf(match.toLowerCase());
    if (match === '' || at < 0) return <>{text}</>;
    return (
        <>
            {text.slice(0, at)}
            <b>{text.slice(at, at + match.length)}</b>
            {text.slice(at + match.length)}
        </>
    );
}
