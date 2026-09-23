'use client';

import Link from 'next/link';
import { type RefObject, useEffect, useRef } from 'react';
import { buildModRunnerHref } from '~src/lib/board-url';
import { rendersAsRoster } from '~src/lib/run-view/roster';
import { PopoverLayer } from '../../shared/popover-layer';
import { usePopoverFocus } from '../../shared/use-popover-focus';
import type { ModContext } from '../load-run-view';
import type { RunViewModel } from '../run-view';
import styles from './decision-bar.module.scss';
import type { RunVerbs } from './use-run-verbs';

type Item = {
    key: string;
    label: string;
    effect: string;
    danger?: boolean;
} & ({ run: () => void } | { href: string });

type Group = { title: string; items: (Item | false)[] };

function scrollToSlot(slot: string) {
    document
        .querySelector(`[data-slot="${slot}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function groupsOf(
    model: RunViewModel,
    mod: ModContext,
    verbs: RunVerbs,
): Group[] {
    const isRun = model.kind === 'run';
    const userId = model.userId;
    const runnerHref =
        userId != null ? buildModRunnerHref(mod.sheet.gameSlug, userId) : null;
    const hasFilters =
        isRun &&
        mod.sheet.variables.some(
            (v) =>
                v.categoryId === model.categoryId &&
                v.role === 'filter' &&
                v.published,
        );
    const rosterEditable =
        rendersAsRoster(model.participants, model) || model.coopBoard === true;
    return [
        {
            title: 'Decide',
            items: [
                verbs.can('approve') && {
                    key: 'verify',
                    label: 'Verify',
                    effect: 'On the board as verified',
                    run: () => void verbs.verify(),
                },
                verbs.can('decline') && {
                    key: 'reject',
                    label: 'Reject',
                    effect: 'Off the board, runner sees the reason',
                    run: () => void verbs.openReject(),
                },
                verbs.can('ask_video') && {
                    key: 'ask_video',
                    label: 'Ask for a video',
                    effect: 'Waits off the board until the runner adds one',
                    run: () => void verbs.askVideo(),
                },
            ],
        },
        {
            title: 'Change the run',
            items: [
                verbs.can('set_time') && {
                    key: 'set_time',
                    label: 'Set time',
                    effect: 'Type the correct time',
                    run: () => void verbs.openVerb('set_time'),
                },
                verbs.can('retime') && {
                    key: 'retime',
                    label: 'Retime from video',
                    effect: 'Mark start and end on the video',
                    run: () => void verbs.openVerb('retime'),
                },
                verbs.can('move') && {
                    key: 'move',
                    label: 'Move to another category',
                    effect: 'Category and subcategory',
                    run: () => void verbs.openVerb('move'),
                },
                hasFilters && {
                    key: 'variables',
                    label: 'Change variables',
                    effect: 'Console, emulator and other filters',
                    run: () => scrollToSlot('facts'),
                },
                rosterEditable && {
                    key: 'runners',
                    label: 'Change runners',
                    effect: 'Credit someone else, or add co-op partners',
                    run: () => scrollToSlot('roster'),
                },
            ],
        },
        {
            title: 'On the board',
            items: [
                verbs.can('send_back') && {
                    key: 'send_back',
                    label: 'Send back to pending',
                    effect: 'Undo a verify',
                    run: () => void verbs.sendBack(),
                },
                verbs.can('remove') && {
                    key: 'remove',
                    label: 'Remove from board',
                    effect: 'Stays on the runner’s profile, off the board',
                    danger: true,
                    run: () => void verbs.openVerb('remove'),
                },
            ],
        },
        {
            title: 'Runner',
            items: runnerHref
                ? [
                      {
                          key: 'runs',
                          label: 'All their runs',
                          effect: `Opens ${model.runnerName} on this game`,
                          href: runnerHref,
                      },
                      {
                          key: 'hide',
                          label: 'Hide their name',
                          effect: 'Shown as an anonymous runner',
                          href: `${runnerHref}?verb=hide_identity`,
                      },
                      {
                          key: 'ban',
                          label: 'Ban from this game',
                          effect: 'All their runs leave the boards',
                          danger: true,
                          href: `${runnerHref}?verb=ban`,
                      },
                  ]
                : [],
        },
        {
            title: 'Moderators only',
            items: [
                verbs.canNote && {
                    key: 'note',
                    label: 'Add a note',
                    effect: 'Only moderators see it',
                    run: verbs.openNote,
                },
            ],
        },
    ];
}

/** The run's other verbs, grouped. Verbs that do not apply are left out. */
export function ActionsMenu({
    open,
    anchorRef,
    onClose,
    model,
    mod,
    verbs,
}: {
    open: boolean;
    anchorRef: RefObject<HTMLElement | null>;
    onClose: () => void;
    model: RunViewModel;
    mod: ModContext;
    verbs: RunVerbs;
}) {
    const panelRef = useRef<HTMLDivElement>(null);
    usePopoverFocus({ open, onClose, panelRef });

    // The layer is hidden until it has been placed, and a hidden element
    // cannot take focus: wait a frame before moving focus in.
    useEffect(() => {
        if (!open) return;
        const frame = requestAnimationFrame(() => {
            panelRef.current?.querySelector<HTMLElement>('a, button')?.focus();
        });
        return () => cancelAnimationFrame(frame);
    }, [open]);

    const groups = groupsOf(model, mod, verbs)
        .map((g) => ({
            title: g.title,
            items: g.items.filter((i): i is Item => i !== false),
        }))
        .filter((g) => g.items.length > 0);

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        const items = Array.from(
            panelRef.current?.querySelectorAll<HTMLElement>('a, button') ?? [],
        );
        if (items.length === 0) return;
        e.preventDefault();
        const at = items.indexOf(document.activeElement as HTMLElement);
        const step = e.key === 'ArrowDown' ? 1 : -1;
        items[(at + step + items.length) % items.length]?.focus();
    };

    return (
        <PopoverLayer
            open={open}
            anchorRef={anchorRef}
            onClose={onClose}
            align="end"
            themed
        >
            <div
                ref={panelRef}
                className={styles.menu}
                role="menu"
                aria-label="Actions"
                onKeyDown={onKeyDown}
            >
                {groups.map((g) => (
                    <div key={g.title} className={styles.group} role="group">
                        <div className={styles.groupTitle}>{g.title}</div>
                        {g.items.map((i) => {
                            const cls = i.danger
                                ? `${styles.item} ${styles.itemDanger}`
                                : styles.item;
                            const body = (
                                <>
                                    <span className={styles.itemLabel}>
                                        {i.label}
                                    </span>
                                    <span className={styles.itemEffect}>
                                        {i.effect}
                                    </span>
                                </>
                            );
                            return 'href' in i ? (
                                <Link
                                    key={i.key}
                                    href={i.href}
                                    className={cls}
                                    role="menuitem"
                                    onClick={onClose}
                                >
                                    {body}
                                </Link>
                            ) : (
                                <button
                                    key={i.key}
                                    type="button"
                                    className={cls}
                                    role="menuitem"
                                    disabled={verbs.busy}
                                    onClick={() => {
                                        onClose();
                                        i.run();
                                    }}
                                >
                                    {body}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>
        </PopoverLayer>
    );
}
