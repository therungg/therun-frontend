'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { VerbMenu, type VerbMenuItem } from '../shared/verb-menu';
import styles from './moderate-panel.module.scss';
import {
    type ModerateVerb,
    NOT_BUILT,
    VERB_EFFECT,
    VERB_KEY,
    VERB_LABEL,
    VERB_MENU_LINE,
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

/** Verbs that take runs off the board, or the runner off the boards. */
const DANGER: ReadonlySet<ModerateVerb> = new Set(['decline', 'remove', 'ban']);

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

    useEffect(() => {
        if (busy) setMenuOpen(false);
    }, [busy]);

    const pick = (verb: ModerateVerb) => {
        const a = byVerb.get(verb);
        if (busy || !a?.enabled) return;
        setMenuOpen(false);
        onVerb(verb);
    };

    // Split before each SEPARATE_BEFORE verb that is not first.
    const menuGroups: VerbMenuItem[][] = [];
    for (const verb of moreVerbs) {
        const a = byVerb.get(verb);
        if (!a) continue;
        if (menuGroups.length === 0 || SEPARATE_BEFORE.has(verb)) {
            menuGroups.push([]);
        }
        menuGroups[menuGroups.length - 1].push({
            key: verb,
            label: VERB_LABEL[verb],
            line: a.enabled ? VERB_MENU_LINE[verb] : a.reason,
            shortcut: VERB_KEY[verb],
            danger: DANGER.has(verb),
            unavailable: !a.enabled,
            onSelect: () => pick(verb),
        });
    }

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
                    <VerbMenu
                        open={menuOpen}
                        anchorRef={moreRef}
                        onClose={() => setMenuOpen(false)}
                        label="More actions"
                        groups={menuGroups}
                        busy={busy}
                        id={menuId}
                        side="top"
                    />
                </div>
            ) : null}
        </div>
    );
}
