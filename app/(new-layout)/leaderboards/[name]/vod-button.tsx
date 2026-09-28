'use client';

import { useState } from 'react';
import { PlayFill } from 'react-bootstrap-icons';
import { Vod } from '~src/components/run/dashboard/vod';
import { isEmbeddableVod } from '~src/lib/vod-url';
import { BoardDialog } from '../../games/[game]/shared/board-dialog';
import styles from './leaderboards-profile.module.scss';

/** A run's video in a dialog over the page. */
export function VodDialog({
    vodUrl,
    title,
    open,
    onClose,
}: {
    vodUrl: string;
    title: string;
    open: boolean;
    onClose: () => void;
}) {
    return (
        <BoardDialog open={open} onClose={onClose} title={title} size="xl">
            <div className={styles.videoDialogHead}>
                <span>{title}</span>
                <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={onClose}
                />
            </div>
            <div className={styles.videoDialogPlayer}>
                {open ? <Vod vod={vodUrl} /> : null}
            </div>
        </BoardDialog>
    );
}

/**
 * The play icon in a run's row. YouTube and Twitch play in a dialog on the
 * page; any other host can't be embedded, so it opens in a new tab.
 */
export function VodButton({
    vodUrl,
    title,
}: {
    vodUrl: string;
    /** What is playing, for the dialog and the button's name. */
    title: string;
}) {
    const [open, setOpen] = useState(false);
    if (!isEmbeddableVod(vodUrl)) {
        return (
            <a
                href={vodUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Watch the run: ${title}`}
                title="Watch the run"
                className={styles.runIcon}
            >
                <PlayFill size={15} aria-hidden />
            </a>
        );
    }
    return (
        <>
            <button
                type="button"
                aria-label={`Watch the run: ${title}`}
                title="Watch the run"
                className={styles.runIcon}
                onClick={() => setOpen(true)}
            >
                <PlayFill size={15} aria-hidden />
            </button>
            <VodDialog
                vodUrl={vodUrl}
                title={title}
                open={open}
                onClose={() => setOpen(false)}
            />
        </>
    );
}
