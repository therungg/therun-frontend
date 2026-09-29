'use client';

import type { RefObject } from 'react';
import { rendersAsRoster } from '~src/lib/run-view/roster';
import {
    type ModerateVerb,
    VERB_KEY,
    VERB_LABEL,
    VERB_MENU_LINE,
} from '../../manage/moderation/moderate/verbs';
import {
    VerbMenu,
    type VerbMenuItem,
} from '../../manage/moderation/shared/verb-menu';
import type { ModContext } from '../load-run-view';
import type { RunViewModel } from '../run-view';
import type { RunVerbs } from './use-run-verbs';

function scrollToSlot(slot: string) {
    document
        .querySelector(`[data-slot="${slot}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/** A verb from the shared vocabulary: its label, line and key. */
function verbItem(
    verb: ModerateVerb,
    onSelect: () => void,
    danger = false,
    keys = false,
): VerbMenuItem {
    return {
        key: verb,
        label: VERB_LABEL[verb],
        line: VERB_MENU_LINE[verb],
        shortcut: keys ? VERB_KEY[verb] : undefined,
        danger,
        onSelect,
    };
}

function groupsOf(
    model: RunViewModel,
    mod: ModContext,
    verbs: RunVerbs,
    inBar: ReadonlySet<ModerateVerb>,
    keys: boolean,
): VerbMenuItem[][] {
    const can = (verb: ModerateVerb) => !inBar.has(verb) && verbs.can(verb);
    const verbItemHere = (
        verb: ModerateVerb,
        onSelect: () => void,
        danger = false,
    ) => verbItem(verb, onSelect, danger, keys);
    const isRun = model.kind === 'run';
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
    const items = (list: (VerbMenuItem | false)[]) =>
        list.filter((i): i is VerbMenuItem => i !== false);
    return [
        items([
            can('approve') &&
                verbItemHere('approve', () => void verbs.verify()),
            can('decline') &&
                verbItemHere('decline', () => void verbs.openReject(), true),
            can('ask_video') &&
                verbItemHere('ask_video', () => void verbs.askVideo()),
            can('set_time') &&
                verbItemHere('set_time', () => void verbs.openVerb('set_time')),
            can('retime') &&
                (verbs.retimed
                    ? {
                          key: 'undo_retime',
                          label: 'Undo retime',
                          line: VERB_MENU_LINE.retime,
                          onSelect: () => void verbs.undoRetime(),
                      }
                    : verbItemHere(
                          'retime',
                          () => void verbs.openVerb('retime'),
                      )),
            can('move') &&
                verbItemHere('move', () => void verbs.openVerb('move')),
            hasFilters && {
                key: 'variables',
                label: 'Change variables',
                onSelect: () => scrollToSlot('facts'),
            },
            rosterEditable && {
                key: 'runners',
                label: 'Change runners',
                onSelect: () => scrollToSlot('roster'),
            },
            can('send_back') &&
                verbItemHere('send_back', () => void verbs.sendBack()),
        ]),
        items([
            verbs.canMark &&
                can('mark') &&
                verbItemHere('mark', () => void verbs.toggleMark()),
            verbs.canNote && verbItemHere('note', verbs.openNote),
        ]),
        items([
            verbs.canRunner && {
                key: 'runner',
                label: 'All their runs',
                onSelect: () => verbs.openRunner(),
            },
            verbs.canRunner &&
                verbItemHere('hide_identity', () =>
                    verbs.openRunner('hide_identity'),
                ),
        ]),
        items([
            can('remove') &&
                verbItemHere(
                    'remove',
                    () => void verbs.openVerb('remove'),
                    true,
                ),
            verbs.canRunner &&
                verbItemHere('ban', () => verbs.openRunner('ban'), true),
        ]),
    ];
}

/**
 * The run's verbs the decision bar does not already show. Verbs that do not
 * apply are left out; the runner's own verbs open the runner panel in place.
 */
export function ActionsMenu({
    open,
    anchorRef,
    onClose,
    model,
    mod,
    verbs,
    inBar,
    keys,
}: {
    open: boolean;
    anchorRef: RefObject<HTMLElement | null>;
    onClose: () => void;
    model: RunViewModel;
    mod: ModContext;
    verbs: RunVerbs;
    /** Verbs the decision bar shows as buttons: not repeated here. */
    inBar: ReadonlySet<ModerateVerb>;
    /** The review keys are on: show each verb's key. */
    keys: boolean;
}) {
    return (
        <VerbMenu
            open={open}
            anchorRef={anchorRef}
            onClose={onClose}
            label="Actions"
            groups={groupsOf(model, mod, verbs, inBar, keys)}
            busy={verbs.busy}
            align="end"
            themed
        />
    );
}
