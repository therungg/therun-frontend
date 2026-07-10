'use client';

import React from 'react';
import type { SlideComponent } from '../deck/deck';
import styles from '../deck/fast50.module.scss';
import { BigNumber, Reveal, SlideShell } from '../deck/primitives';

export const FormCheckSlide: SlideComponent = ({
    dossier,
    evaluation,
    stage,
}) => {
    const form = dossier.form;
    if (!form?.last14dPlaytimeMs) return null;
    const hours = Math.round(form.last14dPlaytimeMs / 3600_000);

    return (
        <SlideShell
            kicker="Form check"
            headline={evaluation.headline}
            stage={stage}
        >
            <BigNumber value={hours} play={stage >= 1} />
            <Reveal when={stage >= 2}>
                <div className={styles.subStat}>
                    active {form.last14dActiveDays} of the last 14 days
                    {form.currentStreakDays
                        ? ` — on a ${form.currentStreakDays}-day streak`
                        : ''}
                </div>
            </Reveal>
        </SlideShell>
    );
};
