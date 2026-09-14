'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, Pin, PlayFill } from 'react-bootstrap-icons';
import { GameImage } from '~src/components/image/gameimage';
import Link from '~src/components/link';
import { Vod, youtubeParser } from '~src/components/run/dashboard/vod';
import { isEmbeddableVod } from '~src/lib/vod-url';
import { safeEncodeURI } from '~src/utils/uri';
import type { PinRef } from '../../../../types/leaderboards-profile.types';
import { EntryStatus } from './entry-row';
import {
    entrySubcategoryLabel,
    formatEntryTime,
    formatProfileDate,
    timingLabel,
} from './format';
import styles from './leaderboards-profile.module.scss';
import { move, readDragIndex, writeDragIndex } from './reorder';
import { useShowcase } from './showcase-provider';
import {
    autoPins,
    entryRef,
    findEntry,
    PIN_LIMIT,
    type Pinned,
    pickVideoPin,
    pinKey,
    resolvePins,
    samePin,
} from './showcase-rules';

const MEDALS: Record<number, string> = { 1: 'gold', 2: 'silver', 3: 'bronze' };

function PinVideo({ vodUrl }: { vodUrl: string }) {
    const [playing, setPlaying] = useState(false);
    const youtubeId = youtubeParser(vodUrl);
    return (
        <div className={styles.featuredVideo}>
            {playing ? (
                <Vod vod={vodUrl} />
            ) : (
                <>
                    {youtubeId ? (
                        <img
                            src={`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`}
                            alt=""
                            loading="lazy"
                            className={styles.featuredThumb}
                        />
                    ) : null}
                    <button
                        type="button"
                        className={styles.featuredPlay}
                        aria-label="Play video"
                        onClick={() => setPlaying(true)}
                    >
                        <PlayFill size={32} aria-hidden />
                    </button>
                </>
            )}
        </div>
    );
}

export function PinCard({
    pin,
    video,
    children,
    dragProps,
}: {
    pin: Pinned;
    video: boolean;
    children?: React.ReactNode;
    dragProps?: React.HTMLAttributes<HTMLElement>;
}) {
    const { entry, game } = pin;
    const medal = entry.rank !== null ? MEDALS[entry.rank] : undefined;
    const vars = entrySubcategoryLabel(entry);
    const timing = timingLabel(entry);
    return (
        <article
            className={video ? `${styles.pin} ${styles.pinWide}` : styles.pin}
            data-medal={medal}
            {...dragProps}
        >
            {video && entry.vodUrl ? <PinVideo vodUrl={entry.vodUrl} /> : null}
            <div className={styles.pinBody}>
                <Link
                    href={`/games/${safeEncodeURI(game.game)}`}
                    className={styles.pinArt}
                    tabIndex={-1}
                    aria-hidden
                >
                    <GameImage
                        src={game.imageUrl ?? ''}
                        alt=""
                        quality="medium"
                        width={60}
                        height={80}
                    />
                </Link>
                <div className={styles.pinText}>
                    <span className={styles.pinRankLine}>
                        <span className={styles.pinRank}>
                            {entry.rank !== null ? `#${entry.rank}` : '—'}
                        </span>
                        {entry.rank !== null &&
                        (entry.totalRunners ?? 0) > 1 ? (
                            <span className={styles.pinOf}>
                                of{' '}
                                {(entry.totalRunners ?? 0).toLocaleString(
                                    'en-US',
                                )}
                            </span>
                        ) : null}
                    </span>
                    <span className={styles.pinGame}>{game.game}</span>
                    <span className={styles.pinTitle}>
                        {entry.category}
                        {entry.level ? ` · ${entry.level}` : ''}
                        {vars ? (
                            <span className={styles.pinVars}> · {vars}</span>
                        ) : null}
                    </span>
                </div>
            </div>
            <div className={styles.pinFoot}>
                <span className={styles.pinTime}>
                    {formatEntryTime(entry)}
                    {timing ? (
                        <span className={styles.entryTiming}>{timing}</span>
                    ) : null}
                </span>
                {entry.runDate ? (
                    <span className={styles.pinDate}>
                        {formatProfileDate(entry.runDate)}
                    </span>
                ) : null}
                <EntryStatus entry={entry} />
            </div>
            {children}
        </article>
    );
}

/** The showcase: the runner's pins, or the best run per game when none. */
export function PinnedRuns() {
    const { games, draft, editing, setDraft } = useShowcase();
    const showAuto = editing && draft.pins.length === 0;
    const pins = editing
        ? showAuto
            ? autoPins(games)
            : draft.pins
                  .map((p) => findEntry(games, p))
                  .filter((p): p is Pinned => p !== null)
        : resolvePins(games, draft.pins);
    if (!editing && pins.length === 0) return null;
    const video = showAuto ? null : pickVideoPin(pins, draft.videoPin);
    const isVideo = (p: Pinned) =>
        video !== null && samePin(entryRef(p.entry), entryRef(video.entry));

    const movePin = (from: number, to: number) =>
        setDraft((d) => ({ ...d, pins: move(d.pins, from, to) }));
    const removePin = (ref: PinRef) =>
        setDraft((d) => ({
            ...d,
            pins: d.pins.filter((p) => !samePin(p, ref)),
            videoPin: samePin(d.videoPin, ref) ? null : d.videoPin,
        }));
    const setVideo = (ref: PinRef) =>
        setDraft((d) => ({ ...d, videoPin: ref }));
    const addPin = (ref: PinRef) =>
        setDraft((d) => ({ ...d, pins: [...d.pins, ref] }));

    return (
        <>
            <section className={styles.pins} aria-label="Pinned runs">
                {pins.map((pin, i) => {
                    const ref = entryRef(pin.entry);
                    return (
                        <PinCard
                            key={pinKey(ref)}
                            pin={pin}
                            video={isVideo(pin)}
                            dragProps={
                                editing && !showAuto
                                    ? {
                                          draggable: true,
                                          onDragStart: (e) =>
                                              writeDragIndex(e, 'pins', i),
                                          onDragOver: (e) => e.preventDefault(),
                                          onDrop: (e) => {
                                              const from = readDragIndex(
                                                  e,
                                                  'pins',
                                              );
                                              if (from === null) return;
                                              movePin(from, i);
                                          },
                                      }
                                    : undefined
                            }
                        >
                            {editing ? (
                                showAuto ? (
                                    <div className={styles.pinTools}>
                                        <button
                                            type="button"
                                            className={styles.pinToggle}
                                            onClick={() => addPin(ref)}
                                        >
                                            <Pin size={13} aria-hidden />
                                            Pin this
                                        </button>
                                    </div>
                                ) : (
                                    <div className={styles.pinTools}>
                                        <button
                                            type="button"
                                            className={styles.tab}
                                            aria-label="Move up"
                                            disabled={i === 0}
                                            onClick={() => movePin(i, i - 1)}
                                        >
                                            <ArrowUp size={14} aria-hidden />
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.tab}
                                            aria-label="Move down"
                                            disabled={i === pins.length - 1}
                                            onClick={() => movePin(i, i + 1)}
                                        >
                                            <ArrowDown size={14} aria-hidden />
                                        </button>
                                        {pin.entry.vodUrl &&
                                        isEmbeddableVod(pin.entry.vodUrl) ? (
                                            <label
                                                className={styles.ledgerSort}
                                            >
                                                <input
                                                    type="radio"
                                                    name="video-pin"
                                                    checked={samePin(
                                                        draft.videoPin,
                                                        ref,
                                                    )}
                                                    onChange={() =>
                                                        setVideo(ref)
                                                    }
                                                />
                                                <span>Plays video</span>
                                            </label>
                                        ) : null}
                                        <button
                                            type="button"
                                            className={styles.tab}
                                            onClick={() => removePin(ref)}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                )
                            ) : null}
                        </PinCard>
                    );
                })}
                {editing && !showAuto && pins.length < PIN_LIMIT ? (
                    <div className={styles.pinSlot}>
                        <Pin size={16} aria-hidden />
                        <span>
                            {PIN_LIMIT - pins.length} of {PIN_LIMIT} slots left
                        </span>
                        <span className={styles.pinSlotHint}>
                            Pin runs from the list below
                        </span>
                    </div>
                ) : null}
            </section>
            {editing && !showAuto && pins.length >= PIN_LIMIT ? (
                <p className={styles.cardNote}>
                    {PIN_LIMIT} pins max, remove one first
                </p>
            ) : null}
        </>
    );
}
