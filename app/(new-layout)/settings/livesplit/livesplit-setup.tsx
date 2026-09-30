import { BoxArrowUpRight } from 'react-bootstrap-icons';
import Link from '~src/components/link';
import paneStyles from '../settings.module.scss';
import { CopyUploadKey } from './copy-upload-key.component';
import styles from './livesplit.module.scss';

export function LivesplitSetup({ uploadKey }: { uploadKey: string }) {
    return (
        <div className={paneStyles.pane}>
            <header className={paneStyles.paneHeader}>
                <h1 className={paneStyles.paneTitle}>LiveSplit key</h1>
            </header>

            <CopyUploadKey uploadKey={uploadKey} />

            <section className={styles.section}>
                <h2 className={styles.sectionHead}>Setup</h2>
                <ol className={styles.steps}>
                    <li>
                        In LiveSplit, open <b>Edit Layout</b> and add{' '}
                        <b>therun.gg</b> from <b>Other</b>.
                    </li>
                    <li>
                        Open <b>Layout Settings</b>, go to the <b>therun.gg</b>{' '}
                        tab and paste your key.
                    </li>
                </ol>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionHead}>Troubleshooting</h2>
                <p className={styles.sectionLead}>
                    Runs not uploading or showing live:
                </p>
                <ul className={styles.checks}>
                    <li>
                        Set the game and category in LiveSplit&apos;s{' '}
                        <b>Edit Splits</b>.
                    </li>
                    <li>
                        Check the therun.gg component is in the layout you run
                        with.
                    </li>
                    <li>
                        Still stuck? <Link href="/contact">Contact us</Link>.
                    </li>
                </ul>
            </section>

            <a
                className={styles.source}
                target="_blank"
                rel="noreferrer"
                href="https://github.com/therungg/LiveSplit.TheRun"
            >
                Component source on GitHub
                <BoxArrowUpRight size={11} aria-hidden />
            </a>
        </div>
    );
}
