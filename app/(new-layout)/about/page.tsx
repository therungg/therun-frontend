import Link from '~src/components/link';
import buildMetadata from '~src/utils/metadata';
import styles from './about.module.scss';

export const metadata = buildMetadata({
    title: 'About',
    description:
        'Free speedrun analytics — live tracking, detailed splits, races, tournaments, and more.',
});

interface FeatureCard {
    icon: string;
    title: string;
    description: string;
    href: string;
    linkText: string;
    external?: boolean;
}

const features: FeatureCard[] = [
    {
        icon: '⚡',
        title: 'Live Tracking',
        description:
            'Watch speedruns as they happen. See current pace, estimated finish time, and split-by-split progress in real time.',
        href: '/live',
        linkText: "See who's live",
    },
    {
        icon: '⏱️',
        title: 'Detailed Splits',
        description:
            'Compare splits against your Sum of Best, best achieved, and averages. Consistency scores and graphs show where you gain and lose time.',
        href: '/AverageTrey/Super%20Mario%20Sunshine/Any%25',
        linkText: 'View an example',
    },
    {
        icon: '👤',
        title: 'Runner Profiles',
        description:
            'Every runner gets a profile with their full stats, personal bests, run history, and a breakdown by game and category.',
        href: '/KallyNui',
        linkText: 'Browse a profile',
    },
    {
        icon: '🎮',
        title: 'Game Pages',
        description:
            'Leaderboards, category stats, and activity metrics for every game. Filter by category and see who\u2019s on top.',
        href: '/games',
        linkText: 'Explore games',
    },
    {
        icon: '🏁',
        title: 'Races',
        description:
            'Create or join races against other runners. MMR-based rankings, race history, and stats per game.',
        href: '/races',
        linkText: 'Go to races',
    },
    {
        icon: '🏆',
        title: 'Tournaments',
        description:
            'Organized competitive events with eligibility rules, live leaderboards, and multi-tier brackets.',
        href: '/tournaments',
        linkText: 'View tournaments',
    },
    {
        icon: '📖',
        title: 'Story Mode',
        description:
            'AI-generated narrative commentary on your runs. Customize tone, pronouns, and language to make every PB a story worth telling.',
        href: '/stories/manage',
        linkText: 'Manage stories',
    },
    {
        icon: '📅',
        title: 'Annual Recap',
        description:
            'Your year in speedrunning \u2014 total playtime, PBs, most-played games, and trends, compiled into a shareable recap.',
        href: '/recap',
        linkText: 'See your recap',
    },
    {
        icon: '🔌',
        title: 'LiveSplit Integration',
        description:
            'Automatic uploads via the LiveSplit component. Set it up once and your splits sync every time you finish a run.',
        href: '/livesplit',
        linkText: 'Set up LiveSplit',
    },
    {
        icon: '🎨',
        title: 'Appearance Customization',
        description:
            'Style your profile with custom colors, themes, and display options. Extended options available for Patreon supporters.',
        href: '/change-appearance',
        linkText: 'Customize',
    },
    {
        icon: '📺',
        title: 'Twitch Extension',
        description:
            'Show your stats directly under your stream. Viewers see your splits, PBs, and live progress without leaving Twitch.',
        href: 'https://dashboard.twitch.tv/extensions/gl1gra1r6ucnkchrswmdsefomfwxai-0.1.0',
        linkText: 'Learn more',
        external: true,
    },
    {
        icon: '🔍',
        title: 'Runs Explorer',
        description:
            'Browse and filter finished runs across all games, categories, and runners. Find any run, any time.',
        href: '/runs',
        linkText: 'Explore runs',
    },
];

export default function About() {
    return (
        <div className={styles.page}>
            <header className={styles.hero}>
                <h1>About The Run</h1>
                <p className={styles.tagline}>
                    Free speedrun analytics. Live tracking, detailed splits,
                    races, and more &mdash; built for runners and their
                    communities.
                </p>
            </header>

            <section aria-label="Features" className={styles.grid}>
                {features.map((feature) => (
                    <article key={feature.title} className={styles.card}>
                        <span className={styles.cardIcon} aria-hidden="true">
                            {feature.icon}
                        </span>
                        <h2 className={styles.cardTitle}>{feature.title}</h2>
                        <p className={styles.cardDescription}>
                            {feature.description}
                        </p>
                        {feature.external ? (
                            <a
                                className={styles.cardLink}
                                href={feature.href}
                                target="_blank"
                                rel="noreferrer"
                            >
                                {feature.linkText} &rarr;
                            </a>
                        ) : (
                            <Link
                                className={styles.cardLink}
                                href={feature.href}
                            >
                                {feature.linkText} &rarr;
                            </Link>
                        )}
                    </article>
                ))}
            </section>
        </div>
    );
}
