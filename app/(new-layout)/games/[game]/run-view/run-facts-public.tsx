'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode, useState } from 'react';
import { Pencil } from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import { selfSetRunDateAction } from '~src/actions/self-evidence.action';
import { formatDuration } from '~src/lib/duration';
import { formatBoardDate } from '~src/lib/format-run-date';
import { originLabel } from '~src/lib/run-view/origin-label';
import { rendersAsRoster } from '~src/lib/run-view/roster';
import { parseSubcategoryKey } from '~src/lib/variables/keys';
import { videoSource } from '~src/lib/vod-url';
import { formatSubcategoryKey } from '../labels';
import { RunnerAvatar } from '../leaderboard/runner-avatar';
import { EvidenceDialog } from './evidence-dialog';
import { effectiveEvidencePerms } from './evidence-perms';
import { toLocalInput } from './mod/fact-editor';
import styles from './mod/mod-layer.module.scss';
import { isTimingVariable, labelOf } from './mod/run-facts';
import type { RunViewModel } from './run-view';

type Fact = { key: string; label: string; value: ReactNode };

function none(): ReactNode {
    return <span className={styles.factNone}>—</span>;
}

function time(ms: number): ReactNode {
    return <span className={styles.mono}>{formatDuration(ms)}</span>;
}

function factsOf(model: RunViewModel): Fact[] {
    const facts: Fact[] = [];
    if (model.realTime != null) {
        facts.push({ key: 'time', label: 'Time', value: time(model.realTime) });
    }
    if (model.gameTime != null) {
        facts.push({
            key: 'gameTime',
            label: model.gameTimeLabel === 'lrt' ? 'Load-removed' : 'Game time',
            value: time(model.gameTime),
        });
    }
    if (model.runDate) {
        facts.push({
            key: 'date',
            label: 'Date',
            value: formatBoardDate(model.runDate),
        });
    }
    facts.push({
        key: 'category',
        label: 'Category',
        value: model.categoryDisplay,
    });
    // The subcategory first, then any other variable the run carries. There
    // are no variable definitions on the public page, so names and values
    // read the way the board header humanises them.
    const keyParts = parseSubcategoryKey(model.subcategoryKey);
    const seen = new Set<string>();
    for (const p of keyParts) {
        seen.add(p.name);
        facts.push({
            key: `sub-${p.name}`,
            label: labelOf(p.name),
            value: formatSubcategoryKey(`${p.name}=${p.value}`) || none(),
        });
    }
    for (const [name, value] of Object.entries(model.variables)) {
        if (!value || seen.has(name) || isTimingVariable(name)) continue;
        facts.push({
            key: `var-${name}`,
            label: labelOf(name),
            value: formatSubcategoryKey(`${name}=${value}`) || value,
        });
    }
    if (model.emulator === true) {
        facts.push({ key: 'emulator', label: 'Emulator', value: 'Yes' });
    }
    facts.push({
        key: 'origin',
        label: 'Origin',
        value: originLabel(model.origin?.path),
    });
    if (rendersAsRoster(model.participants, model)) {
        const runners = model.participants ?? [];
        facts.push({
            key: 'runners',
            label: 'Runners',
            value: (
                <span className={styles.factRunners}>
                    {runners.map((r, i) => (
                        <span
                            key={r.userId ?? r.name}
                            className={styles.factRunnerItem}
                        >
                            <RunnerAvatar
                                name={r.name}
                                picture={r.picture}
                                size="xs"
                            />
                            {r.name}
                            {i < runners.length - 1 ? ',' : ''}
                        </span>
                    ))}
                </span>
            ),
        });
    }
    return facts;
}

/**
 * The run's facts for everyone, the same panel the moderator view corrects
 * them in. Read-only, except the video for whoever can set it.
 */
export function PublicRunFacts({
    model,
    sessionUsername,
    isMod,
}: {
    model: RunViewModel;
    sessionUsername: string | null;
    isMod: boolean;
}) {
    const perms = effectiveEvidencePerms(model, sessionUsername, isMod);
    const canEditVod = perms.canEditVod;
    const canEditDate =
        perms.isOwner && model.verificationStatus !== 'verified';

    return (
        <section className={styles.panel} data-slot="facts">
            <div className={styles.head}>
                <span className={styles.eyebrow}>The run</span>
            </div>
            <div className={styles.facts}>
                {factsOf(model).map((f) =>
                    f.key === 'date' && canEditDate ? (
                        <DateFact key={f.key} model={model} value={f.value} />
                    ) : (
                        <div key={f.key} className={styles.fact}>
                            <span className={styles.factLabel}>{f.label}</span>
                            <span className={styles.factValue}>{f.value}</span>
                            <span />
                        </div>
                    ),
                )}
                <VideoFact
                    model={model}
                    sessionUsername={sessionUsername}
                    isMod={isMod}
                    canEdit={canEditVod}
                />
            </div>
        </section>
    );
}

function DateFact({ model, value }: { model: RunViewModel; value: ReactNode }) {
    const router = useRouter();
    const [editing, setEditing] = useState(false);
    const [date, setDate] = useState(toLocalInput(model.runDate));
    const [busy, setBusy] = useState(false);
    const canSave =
        !busy && date !== '' && date !== toLocalInput(model.runDate);

    const save = async () => {
        if (!canSave) return;
        setBusy(true);
        const res = await selfSetRunDateAction(
            model.id,
            new Date(date).toISOString(),
        );
        setBusy(false);
        if ('error' in res) {
            toast.error(res.error);
            return;
        }
        toast.success('Saved.');
        setEditing(false);
        router.refresh();
    };

    if (!editing) {
        return (
            <button
                type="button"
                className={styles.fact}
                aria-label="Edit date"
                onClick={() => setEditing(true)}
            >
                <span className={styles.factLabel}>Date</span>
                <span className={styles.factValue}>{value}</span>
                <Pencil size={12} className={styles.factPencil} aria-hidden />
            </button>
        );
    }

    return (
        <div
            className={styles.editor}
            role="group"
            aria-label="Date"
            onKeyDown={(e) => {
                if (e.key === 'Escape') setEditing(false);
            }}
        >
            <div className={styles.editorLabel}>Date</div>
            <input
                type="datetime-local"
                aria-label="Date"
                className="form-control form-control-sm"
                value={date}
                max={toLocalInput(new Date().toISOString())}
                onChange={(e) => setDate(e.target.value)}
                disabled={busy}
                autoFocus
            />
            <div className={styles.editorActions}>
                <button
                    type="button"
                    className={styles.pill}
                    onClick={() => setEditing(false)}
                    disabled={busy}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className={styles.btnPrimary}
                    onClick={save}
                    disabled={!canSave}
                >
                    Save
                </button>
            </div>
        </div>
    );
}

function VideoFact({
    model,
    sessionUsername,
    isMod,
    canEdit,
}: {
    model: RunViewModel;
    sessionUsername: string | null;
    isMod: boolean;
    canEdit: boolean;
}) {
    const label = <span className={styles.factLabel}>Video</span>;
    const pencil = (
        <Pencil size={12} className={styles.factPencil} aria-hidden />
    );

    if (!model.vodUrl) {
        if (!canEdit) {
            return (
                <div className={styles.fact}>
                    {label}
                    <span className={styles.factValue}>{none()}</span>
                    <span />
                </div>
            );
        }
        return (
            <EvidenceDialog
                model={model}
                sessionUsername={sessionUsername}
                isMod={isMod}
                className={styles.fact}
                ariaLabel="Add a video"
                label={
                    <>
                        {label}
                        <span className={styles.factValue}>{none()}</span>
                        {pencil}
                    </>
                }
            />
        );
    }

    return (
        <div className={styles.fact}>
            {label}
            <span className={styles.factValue}>
                <a
                    href={model.vodUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.factVideoLink}
                >
                    {videoSource(model.vodUrl) ?? 'Video'} ↗
                </a>
            </span>
            {canEdit ? (
                <EvidenceDialog
                    model={model}
                    sessionUsername={sessionUsername}
                    isMod={isMod}
                    className={styles.factEditBtn}
                    ariaLabel="Edit video link"
                    label={pencil}
                />
            ) : (
                <span />
            )}
        </div>
    );
}
