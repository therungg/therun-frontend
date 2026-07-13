'use client';

import React from 'react';
import type { CustomSlideComponent } from '../deck/deck';
import styles from '../deck/fast50.module.scss';
import { Reveal } from '../deck/primitives';

export const FactSlide: CustomSlideComponent = ({ content, stage }) => {
    if (content.kind !== 'fact') return null;
    const { fact } = content;
    return (
        <div className={styles.slide}>
            <div className={styles.slideContent}>
                <div className={styles.kicker}>
                    {fact.title ?? 'For the record'}
                </div>
                {fact.template === 'versus' && fact.secondary ? (
                    <div className={styles.factVersus}>
                        <Reveal when={stage >= 1}>
                            <span>{fact.body}</span>
                        </Reveal>
                        <Reveal when={stage >= 1} delayMs={250}>
                            <span className={styles.factVs}>vs</span>
                        </Reveal>
                        <Reveal when={stage >= 2}>
                            <span>{fact.secondary}</span>
                        </Reveal>
                    </div>
                ) : (
                    <Reveal when={stage >= 1}>
                        <div
                            className={styles.factBody}
                            data-history={
                                fact.template === 'history' || undefined
                            }
                        >
                            {fact.body}
                        </div>
                    </Reveal>
                )}
            </div>
        </div>
    );
};
