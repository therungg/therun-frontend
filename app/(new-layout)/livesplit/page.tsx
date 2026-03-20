import { getBaseUrl } from '~src/actions/base-url.action';
import { getSession } from '~src/actions/session.action';
import Link from '~src/components/link';
import buildMetadata from '~src/utils/metadata';
import { CopyUploadKey } from './copy-upload-key.component';
import styles from './livesplit.module.scss';

export default async function Livesplit() {
    const session = await getSession();
    const baseUrl = await getBaseUrl();
    const data = await fetch(
        `${baseUrl}/api/users/${session.id}-${session.username}/upload-key`,
    );
    const { result } = (await data.json()) as { result: string };

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1 className={styles.pageTitle}>LiveSplit Key</h1>
                <p className={styles.subtitle}>
                    Connect LiveSplit to therun.gg for live tracking and
                    automatic uploads
                </p>
            </div>

            {session.username ? (
                <div className={styles.keyCard}>
                    <CopyUploadKey uploadKey={result} />
                </div>
            ) : (
                <div className={styles.loginPrompt}>
                    Please log in to access your LiveSplit Key.
                </div>
            )}

            <div className={styles.infoCard}>
                <div className={styles.infoIcon}>⚡</div>
                <div>
                    <div className={styles.infoTitle}>What does this do?</div>
                    <div className={styles.infoBody}>
                        Your LiveSplit key connects LiveSplit to therun.gg. Runs
                        are tracked live, and stats update automatically after
                        every run. Check out the{' '}
                        <Link href="/live">Live page</Link> to see runs in
                        progress.
                    </div>
                </div>
            </div>

            <div className={styles.stepsSection}>
                <h2 className={styles.stepsTitle}>Setup in 2 steps</h2>
                <div className={styles.steps}>
                    <div className={styles.step}>
                        <div className={styles.stepNumber}>1</div>
                        <div>
                            <div className={styles.stepTitle}>
                                Add the component
                            </div>
                            <div className={styles.stepBody}>
                                Open the layout editor in LiveSplit. Add the
                                therun.gg component from the{' '}
                                <strong>Other</strong> dropdown.
                            </div>
                        </div>
                    </div>
                    <div className={styles.step}>
                        <div className={styles.stepNumber}>2</div>
                        <div>
                            <div className={styles.stepTitle}>
                                Paste your key
                            </div>
                            <div className={styles.stepBody}>
                                Open Layout Settings → therun.gg tab → paste
                                your key. Done!
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.benefits}>
                <div className={styles.benefit}>
                    <div className={styles.benefitIcon}>📡</div>
                    <div className={styles.benefitTitle}>Live Tracking</div>
                    <div className={styles.benefitDesc}>
                        Real-time on your profile
                    </div>
                </div>
                <div className={styles.benefit}>
                    <div className={styles.benefitIcon}>🏆</div>
                    <div className={styles.benefitTitle}>Tournaments</div>
                    <div className={styles.benefitDesc}>
                        Join events & compete
                    </div>
                </div>
                <div className={styles.benefit}>
                    <div className={styles.benefitIcon}>🏁</div>
                    <div className={styles.benefitTitle}>Races</div>
                    <div className={styles.benefitDesc}>
                        Race other runners live
                    </div>
                </div>
            </div>

            <details className={styles.troubleshoot}>
                <summary className={styles.troubleshootSummary}>
                    <span className={styles.troubleshootArrow}>▸</span>
                    Troubleshooting
                </summary>
                <div className={styles.troubleshootBody}>
                    <p>
                        If splits don&apos;t upload or runs don&apos;t appear
                        live:
                    </p>
                    <ul>
                        <li>
                            Verify Game and Category fields are set in LiveSplit
                        </li>
                        <li>
                            Verify you added the therun.gg layout from the Other
                            tab
                        </li>
                    </ul>
                    <p>
                        Still not working?{' '}
                        <Link href="/contact">Contact us</Link>
                    </p>
                </div>
            </details>

            <div className={styles.footerLink}>
                <a
                    target="_blank"
                    rel="noreferrer"
                    href="https://github.com/therungg/LiveSplit.TheRun"
                >
                    View component source on GitHub →
                </a>
            </div>
        </div>
    );
}

export const metadata = buildMetadata({
    title: 'Your LiveSplit Key',
    description:
        "Get your LiveSplit key to use in The Run's LiveSplit component from here.",
    index: false,
    follow: false,
});
