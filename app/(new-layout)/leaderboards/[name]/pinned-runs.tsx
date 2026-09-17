'use client';

import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Pin, PlayFill } from 'react-bootstrap-icons';
import { getTwitchVodThumbnailAction } from '~src/actions/vod-thumbnail.action';
import { GameImage } from '~src/components/image/gameimage';
import Link from '~src/components/link';
import { Vod, youtubeParser } from '~src/components/run/dashboard/vod';
import { isEmbeddableVod } from '~src/lib/vod-url';
import type { PinRef } from '../../../../types/leaderboards-profile.types';
import { BoardDialog } from '../../games-v2/[game]/shared/board-dialog';
import { EntryStatus } from './entry-row';
import {
    entryHref,
    entrySubcategoryLabel,
    formatEntryTime,
    formatProfileDate,
    gameRefOf,
    profileBoardHref,
    profileGameHref,
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
    pinKey,
    resolvePins,
    samePin,
} from './showcase-rules';

const MEDALS: Record<number, string> = { 1: 'gold', 2: 'silver', 3: 'bronze' };

/**
 * A thumbnail the size of the card; the video itself plays in a dialog, so
 * the showcase keeps its grid instead of one run taking over the page.
 */
function PinVideo({ vodUrl, title }: { vodUrl: string; title: string }) {
    const [playing, setPlaying] = useState(false);
    const youtubeId = youtubeParser(vodUrl);
    const [twitchThumb, setTwitchThumb] = useState<string | null>(null);
    useEffect(() => {
        if (youtubeId || !vodUrl.includes('twitch')) return;
        let live = true;
        getTwitchVodThumbnailAction(vodUrl).then((url) => {
            if (live) setTwitchThumb(url);
        });
        return () => {
            live = false;
        };
    }, [vodUrl, youtubeId]);
    const thumb = youtubeId
        ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`
        : twitchThumb;
    return (
        <>
            <div className={styles.featuredVideo}>
                {thumb ? (
                    <img
                        src={thumb}
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
                    <PlayFill size={24} aria-hidden />
                </button>
            </div>
            <BoardDialog
                open={playing}
                onClose={() => setPlaying(false)}
                title={title}
                size="xl"
            >
                <div className={styles.videoDialogHead}>
                    <span>{title}</span>
                    <button
                        type="button"
                        className="btn-close"
                        aria-label="Close"
                        onClick={() => setPlaying(false)}
                    />
                </div>
                <div className={styles.videoDialogPlayer}>
                    <Vod vod={vodUrl} />
                </div>
            </BoardDialog>
        </>
    );
}

export function PinCard({
    pin,
    children,
    dragProps,
    boardsVisible,
}: {
    pin: Pinned;
    children?: React.ReactNode;
    dragProps?: React.HTMLAttributes<HTMLElement>;
    /** Whether game and category names may link to their boards. */
    boardsVisible: boolean;
}) {
    const { entry, game } = pin;
    const medal = entry.rank !== null ? MEDALS[entry.rank] : undefined;
    const vars = entrySubcategoryLabel(entry);
    const timing = timingLabel(entry);
    const gameRef = gameRefOf(game);
    const href = entryHref(gameRef, entry);
    const boardHref = profileBoardHref(gameRef, entry, boardsVisible);
    return (
        <article className={styles.pin} data-medal={medal} {...dragProps}>
            {entry.vodUrl && isEmbeddableVod(entry.vodUrl) ? (
                <PinVideo
                    vodUrl={entry.vodUrl}
                    title={`${game.game} · ${entry.category} · ${formatEntryTime(entry)}`}
                />
            ) : null}
            <div className={styles.pinBody}>
                <Link
                    href={profileGameHref(game, boardsVisible)}
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
                    {boardsVisible ? (
                        <Link
                            href={profileGameHref(game, boardsVisible)}
                            className={`${styles.pinGame} ${styles.boardLink}`}
                        >
                            {game.game}
                        </Link>
                    ) : (
                        <span className={styles.pinGame}>{game.game}</span>
                    )}
                    <span className={styles.pinTitle}>
                        {boardHref ? (
                            <Link href={boardHref} className={styles.boardLink}>
                                {entry.category}
                            </Link>
                        ) : (
                            entry.category
                        )}
                        {entry.level ? ` · ${entry.level}` : ''}
                        {vars ? (
                            <span className={styles.pinVars}> · {vars}</span>
                        ) : null}
                    </span>
                </div>
            </div>
            <div className={styles.pinFoot}>
                <span className={styles.pinTime}>
                    {href ? (
                        <Link
                            href={href}
                            className={`${styles.runLink} stretched-link`}
                        >
                            {formatEntryTime(entry)}
                        </Link>
                    ) : (
                        formatEntryTime(entry)
                    )}
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
    const { games, draft, editing, setDraft, boardsVisible } = useShowcase();
    const showAuto = editing && draft.pins.length === 0;
    const pins = editing
        ? showAuto
            ? autoPins(games)
            : draft.pins
                  .map((p) => findEntry(games, p))
                  .filter((p): p is Pinned => p !== null)
        : resolvePins(games, draft.pins);
    if (!editing && pins.length === 0) return null;

    const movePin = (from: number, to: number) =>
        setDraft((d) => ({ ...d, pins: move(d.pins, from, to) }));
    const removePin = (ref: PinRef) =>
        setDraft((d) => ({
            ...d,
            pins: d.pins.filter((p) => !samePin(p, ref)),
            videoPin: samePin(d.videoPin, ref) ? null : d.videoPin,
        }));
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
                            boardsVisible={boardsVisible}
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
