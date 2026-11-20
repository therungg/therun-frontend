'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';
import { formatDuration } from '~src/lib/duration';
import { formatBoardDate } from '~src/lib/format-run-date';
import {
    type RunStatus,
    STATUS_LABEL,
} from '~src/lib/moderation/run-status-copy';
import { normalizeVariableName } from '~src/lib/variables/keys';
import type { SrcConflictChoice } from '../../../../../../../types/src-run-conflicts.types';
import type { WorklistEntry } from '../../../../../../../types/worklist.types';
import type { ModContext } from '../../../run-view/load-run-view';
import { labelOf } from '../../../run-view/mod/run-facts';
import { resolveSrcConflictAction } from '../shared/actions/src-run-sync.action';
import { clocksOfCategory } from '../shared/board-clocks';
import styles from './src-conflict.module.scss';
import { boardLabel } from './worklist-model';

type Side = Record<string, unknown>;
type Field = { key: string; label: string; here: string; src: string };

function fieldsOf(ours: Side, theirs: Side, mod: ModContext): Field[] {
    const { categories, variables } = mod.sheet;
    const category = categories.find((c) => c.id === ours.categoryId);
    const text = (key: string, side: Side): string => {
        const value = side[key];
        if (key === 'categoryId') {
            const id = value as number;
            return boardLabel(
                {
                    categoryId: id,
                    categoryDisplay:
                        categories.find((c) => c.id === id)?.display ??
                        String(id),
                    subcategoryKey: side.subcategoryKey as string,
                },
                variables,
            );
        }
        if (value == null || value === '') return 'None';
        if (key === 'time' || key === 'gameTime') {
            return formatDuration(value as number);
        }
        if (key === 'endedAt') return formatBoardDate(value as string);
        if (key === 'verificationStatus') {
            return STATUS_LABEL[value as RunStatus];
        }
        if (key === 'emulator') return value ? 'Yes' : 'No';
        return String(value);
    };
    const labels: Record<string, string> = {
        categoryId: 'Category',
        time: 'Time',
        gameTime:
            category && clocksOfCategory(category).gameTimeLabel === 'lrt'
                ? 'Load-removed'
                : 'Game time',
        endedAt: 'Date',
        verificationStatus: 'Status',
        vodUrl: 'Video',
        platform: 'Platform',
        emulator: 'Emulator',
    };
    const fields: Field[] = [];
    for (const key of Object.keys(labels)) {
        if (!(key in theirs)) continue;
        fields.push({
            key,
            label: labels[key],
            here: text(key, ours),
            src: text(key, theirs),
        });
    }
    const hereVars = (ours.variables ?? {}) as Record<string, string>;
    const srcVars = (theirs.variables ?? {}) as Record<string, string>;
    for (const v of variables) {
        if (v.categoryId !== ours.categoryId || v.role !== 'filter') continue;
        const name = (value: string | undefined) =>
            value
                ? (v.values.find(
                      (x) =>
                          normalizeVariableName(x[0]) ===
                          normalizeVariableName(value),
                  )?.[0] ?? value)
                : 'None';
        fields.push({
            key: `var-${v.id}`,
            label: labelOf(v.name),
            here: name(hereVars[v.nameNormalized]),
            src: name(srcVars[v.nameNormalized]),
        });
    }
    return fields.filter((f) => f.here !== f.src);
}

export function SrcConflict({
    entry,
    mod,
    onChanged,
}: {
    entry: WorklistEntry | null;
    mod: ModContext;
    onChanged: () => void;
}) {
    const [busy, setBusy] = useState(false);
    const conflict = entry?.srcConflict;
    if (!entry || !conflict) return null;
    const fields = fieldsOf(conflict.ours, conflict.theirs, mod);

    const choose = async (choice: SrcConflictChoice) => {
        setBusy(true);
        const res = await resolveSrcConflictAction(
            mod.sheet.gameSlug,
            entry.runId,
            conflict.id,
            choice,
        );
        setBusy(false);
        if ('error' in res) {
            toast.error(res.error);
            return;
        }
        toast.success(
            choice === 'ours' ? 'Kept ours.' : 'Updated from speedrun.com.',
        );
        onChanged();
    };

    return (
        <div className={styles.conflict}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>
                            <span className="visually-hidden">Field</span>
                        </th>
                        <th>Here</th>
                        <th>speedrun.com</th>
                    </tr>
                </thead>
                <tbody>
                    {fields.map((f) => (
                        <tr key={f.key}>
                            <td className={styles.label}>{f.label}</td>
                            <td>{f.here}</td>
                            <td>{f.src}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className={styles.actions}>
                <button
                    type="button"
                    className={styles.pill}
                    disabled={busy}
                    onClick={() => choose('ours')}
                >
                    Keep ours
                </button>
                <button
                    type="button"
                    className={styles.pill}
                    disabled={busy}
                    onClick={() => choose('theirs')}
                >
                    {"Use speedrun.com's"}
                </button>
            </div>
        </div>
    );
}
