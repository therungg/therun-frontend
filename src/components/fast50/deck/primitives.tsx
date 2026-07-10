'use client';

import clsx from 'clsx';
import React from 'react';
import CountUp from 'react-countup';
import { GameImage } from '~src/components/image/gameimage';
import { formatTimeMs } from '~src/components/live/commentary-drawer/format';
import styles from './fast50.module.scss';

export const Reveal = ({
    when,
    children,
    className,
}: {
    when: boolean;
    children: React.ReactNode;
    className?: string;
}) => (
    <div className={clsx(styles.reveal, when && styles.revealed, className)}>
        {children}
    </div>
);

export const BigNumber = ({
    value,
    play,
    format,
}: {
    value: number;
    play: boolean;
    format?: (n: number) => string;
}) => (
    <div className={styles.hero}>
        {play ? (
            <CountUp
                end={value}
                duration={1.4}
                separator=","
                formattingFn={format}
            />
        ) : (
            <span style={{ opacity: 0 }}>{format ? format(value) : value}</span>
        )}
    </div>
);

export const TimeText = ({
    ms,
    className,
}: {
    ms: number | null | undefined;
    className?: string;
}) => (
    <span className={clsx(styles.timeText, className)}>{formatTimeMs(ms)}</span>
);

export const SlideShell = ({
    kicker,
    headline,
    stage,
    backdrop,
    danger,
    children,
}: {
    kicker: string;
    headline: string;
    stage: number;
    backdrop?: string;
    danger?: boolean;
    children?: React.ReactNode;
}) => (
    <div className={styles.slide} data-danger={danger || undefined}>
        {backdrop ? (
            <div className={styles.backdrop}>
                <GameImage
                    src={backdrop}
                    quality="hd"
                    alt=""
                    fill={false}
                    width={480}
                    height={640}
                />
            </div>
        ) : null}
        <div className={styles.slideContent}>
            <div className={styles.kicker}>{kicker}</div>
            <Reveal when={stage >= 0}>
                <h1 className={styles.headline}>{headline}</h1>
            </Reveal>
            {children}
        </div>
    </div>
);
