'use client';

import clsx from 'clsx';
import Image from 'next/image';
import React from 'react';
import CountUp from 'react-countup';
import { GameImage } from '~src/components/image/gameimage';
import { formatTimeMs } from '~src/components/live/commentary-drawer/format';
import { roadmap } from '~src/lib/fast50/compute';
import type { DossierSplit } from '~src/lib/fast50/dossier.types';
import styles from './fast50.module.scss';

const SVG_W = 1600;
const TRACK_Y = 120;

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
            <span style={{ opacity: 0 }}>
                {format ? format(value) : value.toLocaleString()}
            </span>
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
    avatar,
    children,
}: {
    kicker: string;
    headline: string;
    stage: number;
    backdrop?: string;
    danger?: boolean;
    avatar?: string;
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
                <div className={styles.headlineRow}>
                    {avatar ? (
                        <span className={styles.avatar}>
                            <Image src={avatar} alt="" fill sizes="180px" />
                        </span>
                    ) : null}
                    <h1 className={styles.headline}>{headline}</h1>
                </div>
            </Reveal>
            {children}
        </div>
    </div>
);

// ---------------------------------------------------------------------------
// RoadTrack — the roadmap SVG, shared by RoadmapSlide and DangerZoneSlide.
// `zoom` dims every node but `highlightIndex` and draws a red band behind it.
// ---------------------------------------------------------------------------

export const RoadTrack = ({
    splits,
    stage,
    highlightIndex,
    zoom,
}: {
    splits: DossierSplit[];
    stage: number;
    highlightIndex?: number;
    zoom?: boolean;
}) => {
    const road = roadmap(splits);
    if (road.length === 0) return null;
    const totalMs = road[road.length - 1].atMs;

    // Cap visible landmarks at 8: always keep first, last, highlighted.
    const keep = new Set<number>([road[0].index, road[road.length - 1].index]);
    if (highlightIndex !== undefined) keep.add(highlightIndex);
    const rest = road.filter((r) => !keep.has(r.index));
    const step = Math.ceil(rest.length / Math.max(1, 8 - keep.size));
    const visible = road.filter((r, i) => keep.has(r.index) || i % step === 0);

    const xAt = (atMs: number) => 40 + (atMs / totalMs) * (SVG_W - 80);
    const highlight = visible.find((r) => r.index === highlightIndex);

    return (
        <svg
            viewBox={`0 0 ${SVG_W} 300`}
            className={styles.roadmapSvg}
            role="img"
            aria-label="Run roadmap"
        >
            {zoom && highlight ? (
                <rect
                    x={xAt(highlight.atMs) - 90}
                    y={0}
                    width={180}
                    height={300}
                    className={styles.dangerBand}
                    data-visible={stage >= 1 || undefined}
                />
            ) : null}
            <line
                x1={40}
                y1={TRACK_Y}
                x2={SVG_W - 40}
                y2={TRACK_Y}
                className={styles.roadTrack}
                data-drawn={stage >= 1 || undefined}
            />
            {visible.map((r, i) => {
                const x = xAt(r.atMs);
                const isHighlight = highlightIndex === r.index;
                return (
                    <g
                        key={r.index}
                        className={styles.roadNode}
                        data-visible={stage >= 2 || undefined}
                        data-danger={isHighlight || undefined}
                        data-dimmed={(zoom && !isHighlight) || undefined}
                        style={{ transitionDelay: `${i * 90}ms` }}
                    >
                        <circle cx={x} cy={TRACK_Y} r={isHighlight ? 14 : 9} />
                        <text x={x} y={TRACK_Y + 52} textAnchor="middle">
                            {r.name}
                        </text>
                        <text
                            x={x}
                            y={TRACK_Y + 88}
                            textAnchor="middle"
                            className={styles.roadClock}
                        >
                            {formatTimeMs(r.atMs)}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
};

// ---------------------------------------------------------------------------
// DistributionStrip — horizontal strip plot of finish times: translucent
// ticks per run, an optional shaded p10/p50/p90 band, and labeled markers.
// ---------------------------------------------------------------------------

export const DistributionStrip = ({
    values,
    bands,
    markers,
    play,
}: {
    values: number[];
    bands?: { p10: number; p50: number; p90: number };
    markers?: {
        label: string;
        atMs: number;
        tone: 'accent' | 'gold' | 'muted';
    }[];
    play: boolean;
}) => {
    const H = 220;
    const PAD = 60;
    const baseline = H - 70;
    const all = [
        ...values,
        ...(bands ? [bands.p10, bands.p90] : []),
        ...(markers ?? []).map((m) => m.atMs),
    ];
    if (all.length === 0) return null;
    const min = Math.min(...all);
    const max = Math.max(...all);
    const span = max - min || 1;
    const xAt = (ms: number) => PAD + ((ms - min) / span) * (SVG_W - PAD * 2);

    return (
        <svg
            viewBox={`0 0 ${SVG_W} ${H}`}
            className={styles.distStrip}
            role="img"
            aria-label="Finish time distribution"
        >
            {bands ? (
                <rect
                    x={xAt(bands.p10)}
                    y={baseline - 28}
                    width={Math.max(0, xAt(bands.p90) - xAt(bands.p10))}
                    height={56}
                    className={styles.distBand}
                    data-visible={play || undefined}
                />
            ) : null}
            <line
                x1={PAD}
                y1={baseline}
                x2={SVG_W - PAD}
                y2={baseline}
                className={styles.distAxis}
            />
            {values.map((v, i) => (
                <line
                    key={`${i}-${v}`}
                    x1={xAt(v)}
                    y1={baseline - 20}
                    x2={xAt(v)}
                    y2={baseline + 20}
                    className={styles.distTick}
                    data-visible={play || undefined}
                    style={{ transitionDelay: `${i * 18}ms` }}
                />
            ))}
            {bands ? (
                <line
                    x1={xAt(bands.p50)}
                    y1={baseline - 44}
                    x2={xAt(bands.p50)}
                    y2={baseline + 44}
                    className={styles.distMedian}
                    data-visible={play || undefined}
                />
            ) : null}
            {(markers ?? []).map((m, i) => (
                <g
                    key={m.label}
                    className={styles.distMarker}
                    data-tone={m.tone}
                    data-visible={play || undefined}
                    style={{ transitionDelay: `${(values.length + i) * 18}ms` }}
                >
                    <line
                        x1={xAt(m.atMs)}
                        y1={20}
                        x2={xAt(m.atMs)}
                        y2={baseline + 44}
                    />
                    <text x={xAt(m.atMs)} y={16} textAnchor="middle">
                        {m.label}
                    </text>
                </g>
            ))}
        </svg>
    );
};

// ---------------------------------------------------------------------------
// PercentileBars — horizontal bars, one per item, length = 100 - percentile.
// The best (lowest percentile) item is highlighted in --accent.
// ---------------------------------------------------------------------------

export const PercentileBars = ({
    items,
    play,
}: {
    items: { label: string; percentile: number }[];
    play: boolean;
}) => {
    if (items.length === 0) return null;
    const bestPercentile = Math.min(...items.map((item) => item.percentile));

    return (
        <div className={styles.percentileBars}>
            {items.map((item, i) => (
                <div
                    key={item.label}
                    className={styles.percentileRow}
                    data-best={item.percentile === bestPercentile || undefined}
                >
                    <span className={styles.percentileLabel}>{item.label}</span>
                    <div className={styles.percentileTrack}>
                        <div
                            className={styles.percentileFill}
                            data-visible={play || undefined}
                            style={{
                                width: play
                                    ? `${100 - item.percentile}%`
                                    : '0%',
                                transitionDelay: `${i * 110}ms`,
                            }}
                        />
                    </div>
                    <span className={styles.percentileValue}>
                        top {item.percentile}%
                    </span>
                </div>
            ))}
        </div>
    );
};
