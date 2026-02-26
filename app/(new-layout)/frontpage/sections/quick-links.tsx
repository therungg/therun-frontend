import Link from 'next/link';
import {
    FaBluesky,
    FaChartLine,
    FaDiscord,
    FaGithub,
    FaKey,
    FaPaintbrush,
    FaPatreon,
    FaRobot,
    FaXTwitter,
} from 'react-icons/fa6';
import { Panel } from '~app/(new-layout)/components/panel.component';
import { getSession } from '~src/actions/session.action';
import styles from './quick-links.module.scss';

interface QuickLink {
    href: string;
    label: string;
    icon: React.ComponentType<{ size: number; className?: string }>;
    external?: boolean;
}

function getLinks(session: { user?: string; roles?: string[] }): QuickLink[] {
    const isPatron = session.roles?.some((r) =>
        ['patreon1', 'patreon2', 'patreon3'].includes(r),
    );

    return [
        ...(session.user
            ? [
                  {
                      href: `/${session.user}`,
                      label: 'Go to your Stats',
                      icon: FaChartLine,
                  },
              ]
            : []),
        isPatron
            ? {
                  href: '/change-appearance',
                  label: 'Change your Appearance',
                  icon: FaPaintbrush,
              }
            : {
                  href: '/patron',
                  label: 'Support us',
                  icon: FaPatreon,
              },
        {
            href: '/upload-key',
            label: 'Get your LiveSplit Key',
            icon: FaKey,
        },
        {
            href: '/stories/manage',
            label: 'Set up Story Mode Twitch Bot',
            icon: FaRobot,
        },
        {
            href: process.env.NEXT_PUBLIC_DISCORD_URL ?? '/discord',
            label: 'Join our Discord',
            icon: FaDiscord,
            external: true,
        },
    ];
}

const SOCIAL_LINKS: QuickLink[] = [
    {
        href: process.env.NEXT_PUBLIC_DISCORD_URL ?? '/discord',
        label: 'Discord',
        icon: FaDiscord,
        external: true,
    },
    {
        href: process.env.NEXT_PUBLIC_TWITTER_URL ?? '#',
        label: 'Twitter',
        icon: FaXTwitter,
        external: true,
    },
    {
        href: process.env.NEXT_PUBLIC_BLUESKY_URL ?? '#',
        label: 'Bluesky',
        icon: FaBluesky,
        external: true,
    },
    {
        href: 'https://github.com/therungg',
        label: 'GitHub',
        icon: FaGithub,
        external: true,
    },
];

const LinkItem = ({ link }: { link: QuickLink }) => {
    const Icon = link.icon;

    if (link.external) {
        return (
            <a
                href={link.href}
                className={styles.linkItem}
                target="_blank"
                rel="noreferrer"
            >
                <Icon size={14} className={styles.icon} aria-hidden="true" />
                <span>{link.label}</span>
                <span className="visually-hidden">(opens in a new tab)</span>
            </a>
        );
    }

    return (
        <Link href={link.href} className={styles.linkItem} prefetch={false}>
            <Icon size={14} className={styles.icon} aria-hidden="true" />
            <span>{link.label}</span>
        </Link>
    );
};

export const QuickLinks = async () => {
    const session = await getSession();
    const links = getLinks(session);

    return (
        <Panel subtitle="Navigate" title="Quick Links" className="p-0">
            <div className={styles.content}>
                <div className={styles.group}>
                    <h3 className={styles.groupLabel}>Explore</h3>
                    <div className={styles.linkList}>
                        {links.map((link) => (
                            <LinkItem key={link.href} link={link} />
                        ))}
                    </div>
                </div>
                <div className={styles.group}>
                    <h3 className={styles.groupLabel}>Socials</h3>
                    <div className={styles.linkList}>
                        {SOCIAL_LINKS.map((link) => (
                            <LinkItem key={link.href} link={link} />
                        ))}
                    </div>
                </div>
            </div>
        </Panel>
    );
};
