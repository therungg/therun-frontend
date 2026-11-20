import type { SrcMode } from '../../../../../types/src-board-sync.types';
import styles from '../shared/import-source-line.module.scss';

export function BoardNotice({
    srcMode,
    verificationOn,
    sourceUrl,
}: {
    srcMode: SrcMode;
    verificationOn: boolean;
    sourceUrl: string | null;
}) {
    if (srcMode === 'copy') {
        return (
            <p className={styles.line}>
                Copy of the speedrun.com leaderboard. Runs are submitted and
                verified there.
                {sourceUrl && (
                    <>
                        {' '}
                        <a
                            className={styles.link}
                            href={sourceUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                        >
                            View on speedrun.com
                        </a>
                    </>
                )}
            </p>
        );
    }
    if (!verificationOn) {
        return (
            <p className={styles.line}>
                Runs from The Run are not verified on this board.
            </p>
        );
    }
    return null;
}
