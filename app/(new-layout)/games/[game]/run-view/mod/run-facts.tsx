'use client';

import moment from 'moment';
import { type ReactNode, useState } from 'react';
import { Pencil } from 'react-bootstrap-icons';
import { formatDuration } from '~src/lib/duration';
import { rendersAsRoster } from '~src/lib/run-view/roster';
import {
    normalizeVariableName,
    parseSubcategoryKey,
} from '~src/lib/variables/keys';
import { formatSubcategoryKey } from '../../labels';
import { subcategoryVariablesFor } from '../../manage/boards/subcategory-bands';
import { clocksOfCategory } from '../../manage/moderation/shared/board-clocks';
import type { ModContext } from '../load-run-view';
import type { RunViewModel } from '../run-view';
import { type FactEdit, FactEditor, variableOptions } from './fact-editor';
import styles from './mod-layer.module.scss';

type Fact = {
    key: string;
    label: string;
    value: ReactNode;
    /** An inline editor, a jump to another panel, or nothing (read-only). */
    edit: FactEdit | (() => void) | null;
};

function none(): ReactNode {
    return <span className={styles.factNone}>none</span>;
}

function time(ms: number | null): ReactNode {
    return ms != null ? (
        <span className={styles.mono}>{formatDuration(ms)}</span>
    ) : (
        none()
    );
}

function scrollToRoster() {
    document
        .querySelector('[data-slot="roster"]')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function factsOf(model: RunViewModel, mod: ModContext): Fact[] {
    const isRun = model.kind === 'run';
    const category = mod.sheet.categories.find(
        (c) => c.id === model.categoryId,
    );
    const clocks = category ? clocksOfCategory(category) : null;
    const hasGt =
        model.gameTime != null ||
        clocks?.primaryTiming === 'gametime' ||
        clocks?.showSecondary === true;
    // A manual time carries one clock; only that one can be corrected.
    const editsClock = (ms: number | null) => isRun || ms != null;
    const variables = mod.sheet.variables;
    const facts: Fact[] = [
        {
            key: 'time',
            label: 'Time',
            value: time(model.realTime),
            edit: editsClock(model.realTime)
                ? { kind: 'time', clock: 'rt', currentMs: model.realTime }
                : null,
        },
    ];
    if (hasGt) {
        facts.push({
            key: 'gameTime',
            label:
                (clocks?.gameTimeLabel ?? model.gameTimeLabel) === 'lrt'
                    ? 'Load-removed time'
                    : 'Game time',
            value: time(model.gameTime),
            edit: editsClock(model.gameTime)
                ? { kind: 'time', clock: 'gt', currentMs: model.gameTime }
                : null,
        });
    }
    facts.push({
        key: 'category',
        label: 'Category',
        value: model.categoryDisplay,
        edit: isRun ? { kind: 'move' } : null,
    });

    const keyParts = parseSubcategoryKey(model.subcategoryKey);
    for (const v of subcategoryVariablesFor(model.categoryId, variables)) {
        const part = keyParts.find((p) => p.name === v.nameNormalized);
        const shown = part
            ? formatSubcategoryKey(`${part.name}=${part.value}`, [v])
            : '';
        facts.push({
            key: `sub-${v.id}`,
            label: v.name,
            value: shown || none(),
            edit: isRun ? { kind: 'move' } : null,
        });
    }
    if (isRun) {
        const filters = variables
            .filter(
                (v) =>
                    v.categoryId === model.categoryId &&
                    v.role === 'filter' &&
                    v.published,
            )
            .sort((a, b) => a.sortOrder - b.sortOrder);
        for (const v of filters) {
            const current = normalizeVariableName(
                model.variables[v.nameNormalized] ?? '',
            );
            const label = variableOptions(v).find(
                (o) => o.value === current,
            )?.label;
            facts.push({
                key: `filter-${v.id}`,
                label: v.name,
                value: label || current || none(),
                edit: { kind: 'filter', variable: v, current },
            });
        }
    }

    facts.push({
        key: 'video',
        label: 'Video',
        value: model.vodUrl
            ? model.vodUrl.replace(/^https?:\/\/(www\.)?/, '')
            : none(),
        edit: { kind: 'video' },
    });
    const names = rendersAsRoster(model.participants, model)
        ? model.participants.map((p) => p.name).join(', ')
        : model.runnerName;
    facts.push({
        key: 'runners',
        label: 'Runners',
        value: names,
        edit:
            rendersAsRoster(model.participants, model) || model.coopBoard
                ? scrollToRoster
                : null,
    });
    if (model.runDate) {
        facts.push({
            key: 'date',
            label: 'Date',
            value: moment(model.runDate).format('D MMM YYYY'),
            edit: null,
        });
    }
    const source = sourceOf(model, mod);
    if (source) {
        facts.push({
            key: 'source',
            label: 'Source',
            value: source,
            edit: null,
        });
    }
    const note = mod.review?.modNote ?? mod.provenance?.moderation.modNote;
    if (note) {
        facts.push({ key: 'note', label: 'Note', value: note, edit: null });
    }
    return facts;
}

/** How the run got here, and when: "LiveSplit · 2h ago". */
function sourceOf(model: RunViewModel, mod: ModContext): string | null {
    const ingest = mod.provenance?.ingest ?? null;
    const path = model.origin?.path ?? ingest?.path ?? null;
    const by =
        model.origin?.submittedBy?.name ??
        ingest?.submittedBy?.name ??
        ingest?.createdBy?.name ??
        null;
    const byOther = by && by !== model.runnerName ? ` by ${by}` : '';
    let what: string | null = null;
    switch (path) {
        case 'timer':
            what = 'LiveSplit';
            break;
        case 'submission':
        case 'guest_submit':
            what = `Submitted${byOther}`;
            break;
        case 'manual_self':
            what = 'Manual';
            break;
        case 'manual_mod':
            what = `Manual${byOther}`;
            break;
        case 'src_import':
            what = 'Import';
            break;
    }
    if (!what) return null;
    const at = model.origin?.ingestedAt ?? ingest?.ingestedAt ?? null;
    return at ? `${what} · ${moment(at).fromNow()}` : what;
}

/** The run's facts. Each one opens in place for a moderator to correct. */
export function RunFacts({
    model,
    mod,
    onChanged,
}: {
    model: RunViewModel;
    mod: ModContext;
    onChanged: () => void;
}) {
    const [editing, setEditing] = useState<string | null>(null);
    const facts = factsOf(model, mod);

    return (
        <section className={styles.panel} data-slot="facts">
            <div className={styles.head}>
                <span className={styles.eyebrow}>The run</span>
            </div>
            <div className={styles.facts}>
                {facts.map((f) => {
                    const edit = f.edit;
                    if (
                        editing === f.key &&
                        edit &&
                        typeof edit !== 'function'
                    ) {
                        return (
                            <FactEditor
                                key={f.key}
                                edit={edit}
                                label={f.label}
                                model={model}
                                mod={mod}
                                onClose={() => setEditing(null)}
                                onSaved={() => {
                                    setEditing(null);
                                    onChanged();
                                }}
                            />
                        );
                    }
                    const body = (
                        <>
                            <span className={styles.factLabel}>{f.label}</span>
                            <span className={styles.factValue}>{f.value}</span>
                            {edit ? (
                                <Pencil
                                    size={12}
                                    className={styles.factPencil}
                                    aria-hidden
                                />
                            ) : (
                                <span />
                            )}
                        </>
                    );
                    if (!edit) {
                        return (
                            <div key={f.key} className={styles.fact}>
                                {body}
                            </div>
                        );
                    }
                    return (
                        <button
                            key={f.key}
                            type="button"
                            className={styles.fact}
                            onClick={() =>
                                typeof edit === 'function'
                                    ? edit()
                                    : setEditing(f.key)
                            }
                        >
                            {body}
                        </button>
                    );
                })}
            </div>
        </section>
    );
}
