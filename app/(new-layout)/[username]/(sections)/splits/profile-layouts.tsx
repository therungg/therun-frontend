'use client';

import moment from 'moment';
import { CloudArrowUp, Download, Trash } from 'react-bootstrap-icons';
import Link from '~src/components/link';
import {
    formatBytes,
    useLayouts,
} from '~src/components/run/downloads/layouts-section';
import { ProfileBlock } from '../profile-block';
import ui from '../profile-ui.module.scss';
import styles from './splits.module.scss';

/**
 * The runner's LiveSplit layouts. Visitors only see the block when there is
 * something to download; the owner always gets it, to upload.
 */
export function ProfileLayouts({ username }: { username: string }) {
    const {
        busy,
        fileInputRef,
        handleDownload,
        handleDelete,
        onFileChange,
        isLoaded,
        isOwner,
        layouts,
        cap,
    } = useLayouts(username, true);

    if (!isLoaded || (!isOwner && layouts.length === 0)) {
        return null;
    }
    const atCap = isOwner && cap !== null && layouts.length >= cap;

    return (
        <ProfileBlock
            title="LiveSplit layouts"
            note={
                isOwner
                    ? cap === null
                        ? 'Unlimited as a supporter'
                        : `${layouts.length} of ${cap} slots used`
                    : 'Layouts to use in your own LiveSplit'
            }
            actions={
                isOwner ? (
                    <>
                        <button
                            type="button"
                            className={ui.button}
                            onClick={() => fileInputRef.current?.click()}
                            disabled={busy || atCap}
                        >
                            <CloudArrowUp size={14} aria-hidden />
                            Upload a layout
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".lsl,application/xml,text/xml"
                            onChange={onFileChange}
                            hidden
                        />
                    </>
                ) : null
            }
        >
            <div className={`${ui.panel} ${styles.layouts}`}>
                {layouts.length === 0 ? (
                    <p className={styles.layoutsEmpty}>
                        No layouts yet. Upload a .lsl file to share it here.
                    </p>
                ) : (
                    layouts.map((layout) => (
                        <div
                            key={layout.name}
                            className={`${ui.row} ${ui.rowFlush}`}
                        >
                            <span className={ui.name}>
                                <span className={ui.nameMain}>
                                    {layout.name}
                                </span>
                            </span>
                            <span
                                className={`${ui.small} ${ui.muted} ${ui.end} ${ui.optional}`}
                            >
                                {formatBytes(layout.sizeBytes)}
                            </span>
                            <span
                                className={`${ui.small} ${ui.muted} ${ui.end}`}
                            >
                                {moment(layout.uploadedAt).fromNow()}
                            </span>
                            <span className={styles.actions}>
                                {isOwner ? (
                                    <button
                                        type="button"
                                        className={ui.iconLink}
                                        onClick={() =>
                                            void handleDelete(layout)
                                        }
                                        disabled={busy}
                                        aria-label={`Delete ${layout.name}`}
                                        title="Delete"
                                    >
                                        <Trash size={13} aria-hidden />
                                    </button>
                                ) : null}
                                <button
                                    type="button"
                                    className={ui.button}
                                    onClick={() => void handleDownload(layout)}
                                >
                                    <Download size={13} aria-hidden />
                                    .lsl
                                </button>
                            </span>
                        </div>
                    ))
                )}
            </div>
            {atCap ? (
                <p className={ui.blockNote}>
                    All {cap} free slots are used.{' '}
                    <Link href="/support">Supporters</Link> get unlimited
                    layouts.
                </p>
            ) : null}
        </ProfileBlock>
    );
}
