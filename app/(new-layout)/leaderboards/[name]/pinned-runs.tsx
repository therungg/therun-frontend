'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, Pin, PlayFill } from 'react-bootstrap-icons';
import { VerificationBadge } from '~app/(new-layout)/games-v2/[game]/run-view/run-badges';
import { GameImage } from '~src/components/image/gameimage';
import { Vod, youtubeParser } from '~src/components/run/dashboard/vod';
import { isEmbeddableVod } from '~src/lib/vod-url';
import type { PinRef } from '../../../../types/leaderboards-profile.types';
import { formatEntryTime, formatProfileDate } from './format';
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
    return (
        <article
            className={video ? `${styles.pin} ${styles.pinWide}` : styles.pin}
            {...dragProps}
        >
            {video && entry.vodUrl ? <PinVideo vodUrl={entry.vodUrl} /> : null}
            <div className={styles.pinBody}>
                <GameImage
                    src={game.imageUrl ?? ''}
                    alt=""
                    quality="small"
                    width={48}
                    height={64}
                />
                <div className={styles.pinText}>
                    <span
                        className={
                            entry.rank !== null
                                ? styles.entryRank
                                : `${styles.entryRank} ${styles.entryRankNone}`
                        }
                        data-medal={medal}
                    >
                        {entry.rank !== null ? `#${entry.rank}` : '—'}
                    </span>
                    <span className={styles.pinTitle}>
                        {game.game} · {entry.category}
                        {entry.level ? ` · ${entry.level}` : ''}
                    </span>
                    <span className={styles.pinLine}>
                        <span className={styles.recentTime}>
                            {formatEntryTime(entry)}
                        </span>
                        {entry.runDate ? (
                            <span className={styles.recentDate}>
                                {formatProfileDate(entry.runDate)}
                            </span>
                        ) : null}
                        <VerificationBadge status={entry.status} />
                    </span>
                </div>
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
                                            aria-label="Pin"
                                            title="Pin"
                                            onClick={() => addPin(ref)}
                                        >
                                            <Pin size={14} aria-hidden />
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
                {editing && !showAuto
                    ? Array.from(
                          { length: PIN_LIMIT - pins.length },
                          (_, i) => (
                              <div key={`slot-${i}`} className={styles.pinSlot}>
                                  Pin a run from the list below
                              </div>
                          ),
                      )
                    : null}
            </section>
            {showAuto ? (
                <p className={styles.cardNote}>
                    Showing the automatic picks. Pin runs from the list below to
                    choose your own.
                </p>
            ) : null}
            {editing && !showAuto && pins.length >= PIN_LIMIT ? (
                <p className={styles.cardNote}>
                    {PIN_LIMIT} pins max, remove one first
                </p>
            ) : null}
        </>
    );
}
