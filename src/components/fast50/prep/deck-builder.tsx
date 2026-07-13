'use client';

import React from 'react';
import { composeDeck } from '~src/components/fast50/deck/compose-deck';
import { composePreppedDeck } from '~src/components/fast50/deck/compose-prepped-deck';
import type { DeckKind, RunnerDossier } from '~src/lib/fast50/dossier.types';
import {
    customSlidesFromPrep,
    headlineForCustom,
    type PrepSessionData,
    type PrepSlideRef,
} from '~src/lib/fast50/prep.types';
import styles from './prep-studio.module.scss';

const refKey = (r: PrepSlideRef) => `${r.kind}:${r.id}`;

export const DeckBuilder = ({
    deck,
    dossier,
    data,
    onChange,
    selected,
    onSelect,
}: {
    deck: DeckKind;
    dossier: RunnerDossier;
    data: PrepSessionData;
    onChange: (data: PrepSessionData) => void;
    selected: PrepSlideRef | null;
    onSelect: (ref: PrepSlideRef) => void;
}) => {
    const rawFrozen =
        deck === 'pre' ? data.deckOrder?.pre : data.deckOrder?.post;
    const frozen = rawFrozen && rawFrozen.length > 0 ? rawFrozen : undefined;
    const composed = composePreppedDeck(dossier, data);
    const included: PrepSlideRef[] =
        frozen ??
        composed.slides
            .filter((s) => !s.overflow)
            .map((s) =>
                s.custom
                    ? { kind: 'custom' as const, id: s.id }
                    : { kind: 'stat' as const, id: s.id },
            );

    const custom = customSlidesFromPrep(data, deck);
    const includedKeys = new Set(included.map(refKey));
    const pool: { ref: PrepSlideRef; label: string }[] = [
        ...composeDeck(dossier).map((s) => ({
            ref: { kind: 'stat' as const, id: s.id },
            label: s.id,
        })),
        ...custom.map((c) => ({
            ref: { kind: 'custom' as const, id: c.id },
            label: `✦ ${headlineForCustom(c.content)}`,
        })),
    ].filter((p) => !includedKeys.has(refKey(p.ref)));

    const labelFor = (ref: PrepSlideRef): string => {
        if (ref.kind === 'stat') return ref.id;
        const item = custom.find((c) => c.id === ref.id);
        return item ? `✦ ${headlineForCustom(item.content)}` : `✦ ${ref.id}`;
    };

    const setOrder = (refs: PrepSlideRef[]) =>
        onChange({
            ...data,
            deckOrder: { ...data.deckOrder, [deck]: refs },
        });

    const move = (i: number, dir: -1 | 1) => {
        const next = [...included];
        const j = i + dir;
        if (j < 0 || j >= next.length) return;
        [next[i], next[j]] = [next[j], next[i]];
        setOrder(next);
    };

    const resetToAuto = () => {
        const deckOrder = { ...data.deckOrder };
        delete deckOrder[deck];
        onChange({
            ...data,
            deckOrder: deckOrder.pre || deckOrder.post ? deckOrder : undefined,
        });
    };

    return (
        <div className={styles.pane}>
            <div className={styles.row}>
                <span className={styles.paneTitle}>
                    Deck — {frozen ? 'curated (frozen)' : 'auto order'}
                </span>
                {frozen ? (
                    <button
                        type="button"
                        className={styles.buttonGhost}
                        onClick={resetToAuto}
                    >
                        Reset to auto
                    </button>
                ) : null}
            </div>
            {composed.warnings.map((w) => (
                <div key={w} className={styles.warning}>
                    ⚠ {w}
                </div>
            ))}
            <div className={styles.deckList}>
                {included.map((ref, i) => (
                    <div
                        key={refKey(ref)}
                        className={styles.deckItem}
                        data-custom={ref.kind === 'custom' || undefined}
                        data-selected={
                            (selected && refKey(selected) === refKey(ref)) ||
                            undefined
                        }
                    >
                        <button
                            type="button"
                            className={styles.deckItemLabel}
                            onClick={() => onSelect(ref)}
                        >
                            {i + 1}. {labelFor(ref)}
                        </button>
                        <button
                            type="button"
                            className={styles.iconButton}
                            onClick={() => move(i, -1)}
                        >
                            ↑
                        </button>
                        <button
                            type="button"
                            className={styles.iconButton}
                            onClick={() => move(i, 1)}
                        >
                            ↓
                        </button>
                        <button
                            type="button"
                            className={styles.iconButton}
                            onClick={() =>
                                setOrder(included.filter((_, j) => j !== i))
                            }
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>
            {pool.length > 0 ? (
                <>
                    <div className={styles.paneTitle}>Available</div>
                    <div className={styles.deckList}>
                        {pool.map((p) => (
                            <div
                                key={refKey(p.ref)}
                                className={styles.deckItem}
                                data-custom={
                                    p.ref.kind === 'custom' || undefined
                                }
                            >
                                <span className={styles.deckItemLabel}>
                                    {p.label}
                                </span>
                                <button
                                    type="button"
                                    className={styles.iconButton}
                                    onClick={() =>
                                        setOrder([...included, p.ref])
                                    }
                                >
                                    + add
                                </button>
                            </div>
                        ))}
                    </div>
                </>
            ) : null}
        </div>
    );
};
