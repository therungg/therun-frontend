import Link from '~src/components/link';
import { getTwitchOAuthURL } from '~src/components/twitch/twitch-oauth';
import styles from './leaderboards-page.module.scss';

const STEPS = [
    {
        title: 'Log in with Twitch',
        body: 'No separate account. The name you stream under is the name on the board.',
    },
    {
        title: 'Upload your splits',
        body: 'Point LiveSplit at therun.gg once and it sends every run from then on.',
    },
    {
        title: 'Your PB lands',
        body: 'It appears on every board it qualifies for, ranked against everyone else.',
    },
];

export function GetOnABoard({ signedIn }: { signedIn: boolean }) {
    const loginHref = getTwitchOAuthURL({ returnTo: '/leaderboards' }).href;

    return (
        <section className={styles.card} id="how">
            <h2 className={styles.cardTitle}>Get your runs on a board</h2>
            <ol className={styles.steps}>
                {STEPS.map((step, index) => (
                    <li key={step.title} className={styles.step}>
                        <span className={styles.stepNumber} aria-hidden="true">
                            {index + 1}
                        </span>
                        <span className={styles.stepBody}>
                            <strong>{step.title}</strong>
                            <span>{step.body}</span>
                        </span>
                    </li>
                ))}
            </ol>
            {/* /upload refuses a signed-out visitor, so a signed-out CTA that
                pointed there would bounce. Send them to Twitch login instead. */}
            <Link
                href={signedIn ? '/upload' : loginHref}
                className={styles.cta}
            >
                {signedIn ? 'Upload your splits' : 'Log in with Twitch'}
            </Link>
        </section>
    );
}
