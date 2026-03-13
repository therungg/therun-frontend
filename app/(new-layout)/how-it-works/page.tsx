import HowItWorksPanels from '~app/(new-layout)/how-it-works/how-it-works-panels';
import { getSession } from '~src/actions/session.action';
import buildMetadata from '~src/utils/metadata';
import styles from './how-it-works.module.scss';

export default async function howItWorks() {
    const session = await getSession();

    return (
        <div className={styles.page}>
            <h2>How it works</h2>
            <p>
                The Run is a 100% free speedrun statistics tool. Read how it
                works below!
            </p>
            <HowItWorksPanels session={session} />
        </div>
    );
}

export const metadata = buildMetadata({
    title: 'How It Works',
    description:
        'Learn how The Run works and how it can be useful to you, whether you are a runner yourself or just a fan of speedrunning!',
});
