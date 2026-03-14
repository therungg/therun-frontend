'use client';

import Link from '~src/components/link';
import { TwitchLoginButton } from '~src/components/twitch/TwitchLoginButton';
import styles from './how-it-works.module.scss';

export default function HowItWorksPanels({
    session,
}: {
    session: { username: string };
}) {
    return (
        <ul className={styles.steps}>
            <li className={styles.step}>
                <div className={styles.stepNumber}>01</div>
                <h3 className={styles.stepTitle}>Login with Twitch</h3>
                <div className={styles.stepBody}>
                    <p>
                        By logging in with Twitch, Therun.gg can use your
                        username to link your profile. This way, you can go to{' '}
                        <i>therun.gg/YourName</i> to view your stats!
                    </p>
                    {session.username ? (
                        <p>
                            You are already logged in as{' '}
                            <strong>{session.username}</strong>!
                        </p>
                    ) : (
                        <div className={styles.stepAction}>
                            <TwitchLoginButton url="/how-it-works" />
                        </div>
                    )}
                </div>
            </li>
            <li className={styles.step}>
                <div className={styles.stepNumber}>02</div>
                <h3 className={styles.stepTitle}>Upload some splits</h3>
                <div className={styles.stepBody}>
                    <p>You can upload your LiveSplit splits easily.</p>
                </div>
                {!session.username ? (
                    <p className={styles.stepBody}>Please login first!</p>
                ) : (
                    <div className={styles.stepAction}>
                        <Link href="/upload">
                            <button>Upload now!</button>
                        </Link>
                    </div>
                )}
            </li>
            <li className={styles.step}>
                <div className={styles.stepNumber}>03</div>
                <h3 className={styles.stepTitle}>Check out your stats</h3>
                <div className={styles.stepBody}>
                    <p>
                        After around 30 seconds, your splits will be parsed and
                        available to view!
                    </p>
                    <p>
                        You&apos;ll be able to see statistics about your runs,
                        sessions and splits directly!
                    </p>
                    <p>
                        Visit{' '}
                        {session.username ? (
                            <a href={`/${session.username}`}>your page</a>
                        ) : (
                            'your page'
                        )}{' '}
                        to view them.
                    </p>
                </div>
                {session.username && (
                    <div className={styles.stepAction}>
                        <a href={`/${session.username}`}>
                            <button>See stats!</button>
                        </a>
                    </div>
                )}
            </li>
            <li className={styles.step}>
                <div className={styles.stepNumber}>04</div>
                <h3 className={styles.stepTitle}>Share your page</h3>
                <div className={styles.stepBody}>
                    <p>
                        Anyone can now visit your page by replacing{' '}
                        <i>twitch.tv</i> with <i>therun.gg</i>! Have fun!
                    </p>
                </div>
            </li>
        </ul>
    );
}
