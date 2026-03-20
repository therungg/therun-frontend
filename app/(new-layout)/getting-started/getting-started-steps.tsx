'use client';

import Link from '~src/components/link';
import { TwitchLoginButton } from '~src/components/twitch/TwitchLoginButton';
import styles from './getting-started.module.scss';

interface Step {
    number: string;
    title: string;
    description: string;
    cta: (session: { username: string }) => React.ReactNode;
}

interface Phase {
    label: string;
    steps: Step[];
}

const TWITCH_EXTENSION_URL =
    'https://dashboard.twitch.tv/extensions/gl1gra1r6ucnkchrswmdsefomfwxai-0.1.0';

const phases: Phase[] = [
    {
        label: 'Set Up Your Account',
        steps: [
            {
                number: '01',
                title: 'Sign in with Twitch',
                description:
                    'Log in with your Twitch account to create your profile. Your stats page will be at therun.gg/YourName.',
                cta: (session) =>
                    session.username ? (
                        <p className={styles.stepHint}>
                            Logged in as <strong>{session.username}</strong>
                        </p>
                    ) : (
                        <div className={styles.stepAction}>
                            <TwitchLoginButton url="/getting-started" />
                        </div>
                    ),
            },
            {
                number: '02',
                title: 'Connect LiveSplit',
                description:
                    'Install the therun.gg LiveSplit component and enter your upload key. Your splits sync automatically after every run — this is the recommended way to get your data on the site.',
                cta: (session) =>
                    session.username ? (
                        <div className={styles.stepAction}>
                            <Link href="/livesplit">Get your upload key</Link>
                        </div>
                    ) : (
                        <p className={styles.stepHint}>
                            Sign in first to get your key
                        </p>
                    ),
            },
            {
                number: '03',
                title: 'Or upload manually',
                description:
                    "Don't use LiveSplit? You can drag and drop .lss split files directly.",
                cta: (session) =>
                    session.username ? (
                        <div className={styles.stepAction}>
                            <Link href="/upload">Upload splits</Link>
                        </div>
                    ) : (
                        <p className={styles.stepHint}>
                            Sign in first to upload
                        </p>
                    ),
            },
        ],
    },
    {
        label: 'Explore Your Stats',
        steps: [
            {
                number: '04',
                title: 'Your profile',
                description:
                    'Your runner page shows personal bests, run history, session stats, and consistency scores across all your games and categories.',
                cta: (session) =>
                    session.username ? (
                        <div className={styles.stepAction}>
                            <Link href={`/${session.username}`}>
                                View your profile
                            </Link>
                        </div>
                    ) : (
                        <div className={styles.stepAction}>
                            <Link href="/KallyNui">See an example profile</Link>
                        </div>
                    ),
            },
            {
                number: '05',
                title: 'Detailed splits',
                description:
                    'Dive into any run to compare splits against your Sum of Best, best achieved, and averages. See where you gain and lose time with consistency graphs.',
                cta: () => (
                    <div className={styles.stepAction}>
                        <Link href="/AverageTrey/Super%20Mario%20Sunshine/Any%25">
                            View example splits
                        </Link>
                    </div>
                ),
            },
            {
                number: '06',
                title: 'Runs Explorer',
                description:
                    'Browse and filter completed runs across all games, categories, and runners.',
                cta: () => (
                    <div className={styles.stepAction}>
                        <Link href="/runs">Explore runs</Link>
                    </div>
                ),
            },
        ],
    },
    {
        label: 'Compete',
        steps: [
            {
                number: '07',
                title: 'Races',
                description:
                    'Create or join head-to-head races against other runners. Track your MMR ranking, race history, and per-game stats.',
                cta: () => (
                    <div className={styles.stepAction}>
                        <Link href="/races">Go to races</Link>
                    </div>
                ),
            },
            {
                number: '08',
                title: 'Tournaments',
                description:
                    'Compete in organized events with eligibility rules, live leaderboards, and brackets.',
                cta: () => (
                    <div className={styles.stepAction}>
                        <Link href="/tournaments">View tournaments</Link>
                    </div>
                ),
            },
        ],
    },
    {
        label: 'Make It Yours',
        steps: [
            {
                number: '09',
                title: 'Story Mode',
                description:
                    'Get AI-generated narrative commentary on your runs. Customize the tone, pronouns, and language to make every PB a story worth sharing.',
                cta: (session) =>
                    session.username ? (
                        <div className={styles.stepAction}>
                            <Link href="/stories/manage">Manage stories</Link>
                        </div>
                    ) : (
                        <p className={styles.stepHint}>
                            Sign in to set up stories
                        </p>
                    ),
            },
            {
                number: '10',
                title: 'Customize your appearance',
                description:
                    'Style your profile with custom colors, themes, and display options. Extended options available for Patreon supporters.',
                cta: (session) =>
                    session.username ? (
                        <div className={styles.stepAction}>
                            <Link href="/change-appearance">Customize</Link>
                        </div>
                    ) : (
                        <p className={styles.stepHint}>Sign in to customize</p>
                    ),
            },
            {
                number: '11',
                title: 'Twitch Extension',
                description:
                    'Show your stats directly under your stream. Viewers see your splits, PBs, and live progress without leaving Twitch.',
                cta: () => (
                    <div className={styles.stepAction}>
                        <a
                            href={TWITCH_EXTENSION_URL}
                            target="_blank"
                            rel="noreferrer"
                        >
                            Get the extension
                        </a>
                    </div>
                ),
            },
            {
                number: '12',
                title: 'Annual Recap',
                description:
                    'Your year in speedrunning — total playtime, PBs, most-played games, and trends compiled into a shareable recap.',
                cta: () => (
                    <div className={styles.stepAction}>
                        <Link href="/recap">See your recap</Link>
                    </div>
                ),
            },
        ],
    },
];

export default function GettingStartedSteps({
    session,
}: {
    session: { username: string };
}) {
    return (
        <>
            {phases.map((phase) => (
                <section key={phase.label} className={styles.phase}>
                    <h2 className={styles.phaseLabel}>{phase.label}</h2>
                    <div className={styles.steps}>
                        {phase.steps.map((step) => (
                            <div key={step.number} className={styles.step}>
                                <div className={styles.stepNumber}>
                                    {step.number}
                                </div>
                                <div className={styles.stepContent}>
                                    <h3 className={styles.stepTitle}>
                                        {step.title}
                                    </h3>
                                    <p className={styles.stepDescription}>
                                        {step.description}
                                    </p>
                                    {step.cta(session)}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            ))}
        </>
    );
}
