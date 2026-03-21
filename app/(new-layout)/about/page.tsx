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

interface FeatureGroup {
    label: string;
    features: FeatureCard[];
}

const featureGroups: FeatureGroup[] = [
    {
        label: 'Explore',
        features: [
            {
                icon: '⚡',
                title: 'Live Tracking',
                description:
                    'Watch speedruns as they happen. See current pace and split-by-split progress in real time. Follow multiple runners at once.',
                href: '/live',
                linkText: "See who's live",
            },
            {
                icon: '⏱️',
                title: 'Detailed Splits',
                description:
                    'Advanced stats for every run. Compare splits against your Sum of Best, best achieved, and averages. Consistency scores and graphs show where you gain and lose time.',
                href: '/greensuigi/Super%20Mario%2064/70%20Star$gameregion%3Ausantsc',
                linkText: 'View an example',
            },
            {
                icon: '👤',
                title: 'Runner Profiles',
                description:
                    'Every runner gets a profile with their full stats, personal bests, run history, and a breakdown by game and category.',
                href: '/abney317',
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
                icon: '🔍',
                title: 'Runs Explorer',
                description:
                    'Browse and filter finished runs across all games, categories, and runners. Find any run, any time.',
                href: '/runs',
                linkText: 'Explore runs',
            },
        ],
    },
    {
        label: 'Compete',
        features: [
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
                    'Run fully automated LTA (Leaderboard Time Attack) tournaments with custom eligibility rules, live standings, and automatic result tracking. Set it up and let it run.',
                href: '/tournaments',
                linkText: 'View tournaments',
            },
        ],
    },
    {
        label: 'Tools',
        features: [
            {
                icon: '🔌',
                title: 'LiveSplit Integration',
                description:
                    'Connect LiveSplit to stream your run data to the site in real time. Your live splits, current pace, and progress update automatically as you play.',
                href: '/livesplit',
                linkText: 'Set up LiveSplit',
            },
            {
                icon: '📖',
                title: 'Story Mode',
                description:
                    'Automated narrative messages posted directly in your Twitch chat as you run. Your viewers get live commentary on splits, PBs, and milestones. Customize tone, pronouns, and language to match your stream.',
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
                icon: '🎨',
                title: 'Appearance Customization',
                description:
                    'Patreon supporters get a bunny badge and a custom name color on their profile. A small way to stand out and support the site.',
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
        ],
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

            {featureGroups.map((group) => (
                <section
                    key={group.label}
                    aria-label={group.label}
                    className={styles.group}
                >
                    <h2 className={styles.groupLabel}>{group.label}</h2>
                    <div className={styles.grid}>
                        {group.features.map((feature) => (
                            <article
                                key={feature.title}
                                className={styles.card}
                            >
                                <span
                                    className={styles.cardIcon}
                                    aria-hidden="true"
                                >
                                    {feature.icon}
                                </span>
                                <h3 className={styles.cardTitle}>
                                    {feature.title}
                                </h3>
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
                    </div>
                </section>
            ))}
        </div>
    );
}
