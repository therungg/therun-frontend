import GettingStartedSteps from '~app/(new-layout)/getting-started/getting-started-steps';
import { getSession } from '~src/actions/session.action';
import buildMetadata from '~src/utils/metadata';
import styles from './getting-started.module.scss';

export default async function GettingStarted() {
    const session = await getSession();

    return (
        <div className={styles.page}>
            <header className={styles.hero}>
                <h1>Getting Started</h1>
                <p className={styles.tagline}>
                    Everything you need to start tracking, analyzing, and
                    competing.
                </p>
            </header>
            <GettingStartedSteps session={session} />
        </div>
    );
}

export const metadata = buildMetadata({
    title: 'Getting Started',
    description:
        'Step-by-step guide to using The Run — set up your account, track your splits, explore your stats, race other runners, and more.',
});
