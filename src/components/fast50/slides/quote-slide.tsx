'use client';

import Image from 'next/image';
import React from 'react';
import type { CustomSlideComponent } from '../deck/deck';
import styles from '../deck/fast50.module.scss';
import { Reveal } from '../deck/primitives';

export const QuoteSlide: CustomSlideComponent = ({
    dossier,
    content,
    stage,
}) => {
    if (content.kind !== 'quote') return null;
    const { quote } = content;
    return (
        <div className={styles.slide}>
            <div className={styles.slideContent}>
                <div className={styles.kicker}>
                    {quote.context ?? 'In their own words'}
                </div>
                <Reveal when={stage >= 1}>
                    <blockquote className={styles.quoteText}>
                        “{quote.text}”
                    </blockquote>
                </Reveal>
                <Reveal when={stage >= 2}>
                    <div className={styles.quoteAttribution}>
                        {dossier.runner.picture ? (
                            <span className={styles.avatar}>
                                <Image
                                    src={dossier.runner.picture}
                                    alt=""
                                    fill
                                    sizes="120px"
                                />
                            </span>
                        ) : null}
                        — {dossier.runner.username}
                    </div>
                </Reveal>
            </div>
        </div>
    );
};
