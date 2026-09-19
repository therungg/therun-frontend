'use client';

import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import { PopoverLayer } from '../../../shared/popover-layer';
import styles from './moderate-panel.module.scss';
import {
    type ModerateVerb,
    NOT_BUILT,
    VERB_EFFECT,
    VERB_KEY,
    VERB_LABEL,
    type VerbAvailability,
} from './verbs';

interface Props {
    bar: ModerateVerb[];
    more: ModerateVerb[];
    availability: VerbAvailability[];
    busy: boolean;
    onVerb: (verb: ModerateVerb) => void;
    /** Bulk only: how many selected runs each verb acts on, shown after the label. */
    counts?: Partial<Record<ModerateVerb, number>>;
}

/** Menu groups: board changes first, then identity and private flags. */
const SEPARATE_BEFORE: ReadonlySet<ModerateVerb> = new Set(['hide_identity']);

function Chevron({ up }: { up: boolean }) {
    return (
        <svg viewBox="0 0 24 24" className={styles.chevron} aria-hidden="true">
            <path d={up ? 'm18 15-6-6-6 6' : 'm6 9 6 6 6-6'} />
        </svg>
    );
}

export function VerbBar({
    bar,
    more,
    availability,
    busy,
    onVerb,
    counts,
}: Props) {
    const byVerb = new Map(availability.map((a) => [a.verb, a]));
    const [menuOpen, setMenuOpen] = useState(false);
    const moreRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuId = useId();

    // A verb you can see is a verb you can press. What this run's state rules
    // out is not shown greyed with its reason — it is simply not there. The
    // exception is a verb still waiting on a read: that one holds its place
    // rather than appearing a moment later under the moderator's cursor.
    const visible = (verbs: ModerateVerb[]) =>
        verbs.filter((v) => {
            const a = byVerb.get(v);
            return !NOT_BUILT.has(v) && !!a && (a.enabled || !!a.pending);
        });
    const barVerbs = visible(bar);
    const moreVerbs = visible(more);

    // Escape closes the menu. It listens on window in the capture phase so it
    // runs before the dialog's own Escape handler on document, and stops
    // there: closing the menu must not close the modal. Outside-click closing
    // belongs to `PopoverLayer` — the menu is portaled out of this bar, so
    // "outside" has to mean outside the trigger AND the portaled panel.
    useEffect(() => {
        if (!menuOpen) return;
        const onKey = (e: globalThis.KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            e.stopPropagation();
            e.preventDefault();
            setMenuOpen(false);
            triggerRef.current?.focus();
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [menuOpen]);

    useEffect(() => {
        if (!menuOpen) return;
        menuRef.current
            ?.querySelector<HTMLElement>('[role="menuitem"]')
            ?.focus();
    }, [menuOpen]);

    useEffect(() => {
        if (busy) setMenuOpen(false);
    }, [busy]);

    const pick = (verb: ModerateVerb) => {
        const a = byVerb.get(verb);
        if (busy || !a?.enabled) return;
        setMenuOpen(false);
        onVerb(verb);
    };

    const onMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') {
            if (e.key === 'Tab') setMenuOpen(false);
            return;
        }
        e.preventDefault();
        const items = Array.from(
            menuRef.current?.querySelectorAll<HTMLElement>(
                '[role="menuitem"]',
            ) ?? [],
        );
        if (!items.length) return;
        const at = items.indexOf(document.activeElement as HTMLElement);
        const step = e.key === 'ArrowDown' ? 1 : -1;
        items[(at + step + items.length) % items.length].focus();
    };

    const renderBarVerb = (verb: ModerateVerb) => {
        const a = byVerb.get(verb);
        if (!a) return null;
        const key = VERB_KEY[verb];
        const count = counts?.[verb];
        const primary = verb === 'approve' && a.enabled;
        return (
            <button
                key={verb}
                type="button"
                className={styles.verb}
                data-primary={primary || undefined}
                data-verb={verb}
                disabled={busy}
                aria-disabled={a.enabled ? undefined : true}
                title={a.enabled ? VERB_EFFECT[verb] : a.reason}
                onClick={() => pick(verb)}
            >
                {VERB_LABEL[verb]}
                {count !== undefined ? ` ${count}` : null}
                {key ? <kbd className={styles.key}>{key}</kbd> : null}
            </button>
        );
    };

    return (
        <div className={styles.bar}>
            {barVerbs.map(renderBarVerb)}
            {moreVerbs.length ? (
                <div ref={moreRef} className={styles.more}>
                    <button
                        ref={triggerRef}
                        type="button"
                        className={styles.verb}
                        data-more
                        data-open={menuOpen || undefined}
                        aria-haspopup="menu"
                        aria-expanded={menuOpen}
                        aria-controls={menuOpen ? menuId : undefined}
                        disabled={busy}
                        onClick={() => setMenuOpen((o) => !o)}
                    >
                        More
                        <Chevron up={menuOpen} />
                    </button>
                    <PopoverLayer
                        open={menuOpen}
                        anchorRef={moreRef}
                        onClose={() => setMenuOpen(false)}
                        align="end"
                        side="top"
                        gap={6}
                    >
                        <div
                            ref={menuRef}
                            id={menuId}
                            className={styles.moreMenu}
                            role="menu"
                            aria-label="More actions"
                            onKeyDown={onMenuKeyDown}
                        >
                            {moreVerbs.map((verb) => {
                                const a = byVerb.get(verb);
                                if (!a) return null;
                                const key = VERB_KEY[verb];
                                return [
                                    SEPARATE_BEFORE.has(verb) &&
                                    verb !== moreVerbs[0] ? (
                                        <div
                                            key={`${verb}-sep`}
                                            className={styles.menuSep}
                                            role="separator"
                                        />
                                    ) : null,
                                    <button
                                        key={verb}
                                        type="button"
                                        role="menuitem"
                                        className={styles.verbMore}
                                        data-verb={verb}
                                        aria-disabled={
                                            a.enabled ? undefined : true
                                        }
                                        onClick={() => pick(verb)}
                                    >
                                        <span>{VERB_LABEL[verb]}</span>
                                        {key ? (
                                            <kbd className={styles.key}>
                                                {key}
                                            </kbd>
                                        ) : (
                                            <span />
                                        )}
                                        <small>
                                            {a.enabled
                                                ? VERB_EFFECT[verb]
                                                : a.reason}
                                        </small>
                                    </button>,
                                ];
                            })}
                        </div>
                    </PopoverLayer>
                </div>
            ) : null}
        </div>
    );
}
