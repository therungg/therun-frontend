'use client';

import React from 'react';
import {
    CloudArrowDown,
    Discord,
    Heart,
    Infinity as InfinityIcon,
    Layers,
    Magic,
    Palette,
    PersonBadge,
    Stars,
    Stopwatch,
} from 'react-bootstrap-icons';
import { FaPatreon, FaPaypal } from 'react-icons/fa6';
import { SiKofi } from 'react-icons/si';
import type { PatronPreferences } from 'types/patreon.types';
import Link from '~src/components/link';
import { UserLink } from '~src/components/links/links';
import { PatreonName } from '~src/components/patreon/patreon-name';
import { usePatreons } from '~src/components/patreon/use-patreons';
import { BunnyIcon } from '~src/icons/bunny-icon';
import styles from './patron.module.scss';

const patreonUrl = 'https://patreon.com/therungg';
const stripePaymentButton = 'https://donate.stripe.com/8wMg2RgR3gNfblu7ss';
const koFiUrl = 'https://ko-fi.com/therungg';
const paypalUrl = 'https://www.paypal.com/ncp/payment/4MWKCJ6MY5HDQ';

const PREVIEW_NAME = 'YourName';

const tier1Preview: PatronPreferences = {
    hide: false,
    featureInScrollbar: false,
    featureOnOverview: false,
    showIcon: false,
    customColor: { dark: '#fbbf24', light: '#d97706' },
};

const tier2Preview: PatronPreferences = {
    hide: false,
    featureInScrollbar: false,
    featureOnOverview: false,
    showIcon: false,
    customGradient: {
        dark: ['#60a5fa', '#a78bfa', '#f472b6'],
        light: ['#2563eb', '#7c3aed', '#db2777'],
    },
    gradientAngle: { dark: 90, light: 90 },
    bold: true,
};

const tier3Preview: PatronPreferences = {
    hide: false,
    featureInScrollbar: false,
    featureOnOverview: false,
    showIcon: false,
    customGradient: {
        dark: ['#fbbf24', '#f472b6', '#a78bfa', '#60a5fa', '#fbbf24'],
        light: ['#d97706', '#db2777', '#7c3aed', '#2563eb', '#d97706'],
    },
    gradientAngle: { dark: 90, light: 90 },
    gradientAnimated: true,
    bold: true,
    italic: true,
};

export function PatreonInfo({ session }: { session: { username: string } }) {
    return (
        <div className={styles.patronPage}>
            <HeroSection session={session} />
            <ValueProps />
            <TierCards />
            <WhyItMatters />
            <PatronsWall />
            <FinalCta session={session} />
        </div>
    );
}

function HeroSection({ session }: { session: { username: string } }) {
    const { data: patreonData } = usePatreons();
    const patronCount = patreonData ? Object.keys(patreonData).length : 0;

    return (
        <section className={styles.hero}>
            <div className={styles.heroGlow} aria-hidden="true" />
            <div className={styles.heroInner}>
                <div className={styles.heroBunny} aria-hidden="true">
                    <BunnyIcon size={72} />
                </div>
                {patronCount > 0 && (
                    <p className={styles.heroSocialProof}>
                        <span
                            className={styles.heroSocialDot}
                            aria-hidden="true"
                        />
                        Join{' '}
                        <strong className={styles.heroSocialCount}>
                            {patronCount}
                        </strong>{' '}
                        {patronCount === 1 ? 'supporter' : 'supporters'} keeping
                        therun.gg independent
                    </p>
                )}
                <p className={styles.heroKicker}>Support therun.gg</p>
                <h1 className={styles.heroTitle}>
                    Free forever.
                    <br />
                    <span className={styles.heroTitleAccent}>
                        Not for free.
                    </span>
                </h1>
                <p className={styles.heroLead}>
                    therun.gg has never had ads, never sold your data, and never
                    will. It runs because speedrunners like you choose to chip
                    in. In return, supporters get real, concrete features that
                    make the site genuinely better for them — plus a few little
                    thank-yous along the way.
                </p>

                <div className={styles.heroCtas}>
                    <Link
                        target="_blank"
                        rel="noreferrer"
                        href={patreonUrl}
                        className={`btn btn-primary btn-lg ${styles.heroCtaPrimary}`}
                    >
                        <FaPatreon size={18} />
                        <span>Become a Patron</span>
                    </Link>
                    <Link
                        target="_blank"
                        rel="noreferrer"
                        href={koFiUrl}
                        className={`btn btn-outline-primary btn-lg ${styles.heroCtaSecondary}`}
                    >
                        <SiKofi size={18} />
                        <span>Tip on Ko-fi</span>
                    </Link>
                    <Link
                        target="_blank"
                        rel="noreferrer"
                        href={paypalUrl}
                        className={`btn btn-outline-primary btn-lg ${styles.heroCtaSecondary}`}
                    >
                        <FaPaypal size={18} />
                        <span>PayPal</span>
                    </Link>
                    <Link
                        target="_blank"
                        rel="noreferrer"
                        href={stripePaymentButton}
                        className={`btn btn-outline-primary btn-lg ${styles.heroCtaSecondary}`}
                    >
                        Stripe
                    </Link>
                </div>

                <p className={styles.heroFinePrint}>
                    Patreon links directly to supporter tiers and perks.
                    Donating one-time via Ko-fi, PayPal, or Stripe? Message me
                    on Discord or email after and I'll grant your supporter
                    perks manually.
                </p>

                {session.username && (
                    <p className={styles.heroClaim}>
                        Already a supporter?{' '}
                        <a href="/change-appearance">Claim your perks →</a>
                    </p>
                )}
            </div>
        </section>
    );
}

function ValueProps() {
    const perks = [
        {
            icon: <CloudArrowDown size={28} />,
            title: 'Cloud backups of every upload',
            body: 'Every time you upload splits, therun.gg keeps a versioned copy in the cloud — the last 5 uploads plus a daily snapshot. Roll back any upload with a single click.',
            tone: 'primary' as const,
        },
        {
            icon: <Layers size={28} />,
            title: 'Unlimited LiveSplit layouts',
            body: 'Store as many .lsl layout files on your profile as you want. Non-supporters are capped at 5 — you get infinite.',
            tone: 'accent' as const,
        },
        {
            icon: <InfinityIcon size={28} />,
            title: 'Daily snapshots kept forever (Tier 3)',
            body: 'At Tier 3, every daily backup of every run stays in the cloud indefinitely. No expiry, no cleanup — your entire speedrun history preserved.',
            tone: 'success' as const,
        },
        {
            icon: <BunnyIcon size={26} />,
            title: 'The golden bunny',
            body: "Your name gets a little golden bunny next to it everywhere you appear on the site. It's a quiet flex that says you helped keep this thing alive.",
            tone: 'warning' as const,
        },
        {
            icon: <Palette size={28} />,
            title: 'Style how your name appears',
            body: 'Solid color at Tier 1, gradients at Tier 2, fully animated and stylized effects at Tier 3 — pick how your name renders across therun.gg.',
            tone: 'accent' as const,
        },
        {
            icon: <Discord size={28} />,
            title: 'Exclusive Discord access',
            body: 'Unlock a supporter-only role and channel in the therun.gg Discord. Talk directly with me and the other people who keep the site running.',
            tone: 'primary' as const,
        },
        {
            icon: <Stars size={28} />,
            title: 'Shoutout on the supporters wall',
            body: 'Every supporter shows up on the therun.gg supporters page. A little public thank-you for keeping the site alive.',
            tone: 'warning' as const,
        },
        {
            icon: <Magic size={28} />,
            title: 'First look at new features',
            body: 'Every supporter — any tier — gets early access to new features before they roll out to everyone else.',
            tone: 'success' as const,
        },
    ];

    return (
        <section className={styles.valueSection}>
            <header className={styles.sectionHead}>
                <p className={styles.sectionKicker}>
                    What your support unlocks
                </p>
                <h2 className={styles.sectionTitle}>
                    Real features, not just cosmetics
                </h2>
                <p className={styles.sectionLead}>
                    Supporter perks aren't fluff. They're the parts of therun.gg
                    that cost the most to operate — cloud storage, backups,
                    layouts. Your support is what keeps them free and growing
                    for everyone.
                </p>
            </header>

            <div className={styles.valueGrid}>
                {perks.map((perk) => (
                    <article
                        key={perk.title}
                        className={`${styles.perkCard} ${
                            styles[`perkCard_${perk.tone}`]
                        }`}
                    >
                        <div className={styles.perkIcon} aria-hidden="true">
                            {perk.icon}
                        </div>
                        <h3 className={styles.perkTitle}>{perk.title}</h3>
                        <p className={styles.perkBody}>{perk.body}</p>
                    </article>
                ))}
            </div>
        </section>
    );
}

function TierCards() {
    const tiers = [
        {
            name: 'Tier 1',
            tagline: 'Start supporting',
            highlights: [
                'Cloud backups of every upload',
                'Daily snapshots kept 90 days',
                'Unlimited LiveSplit layouts',
                'The golden bunny next to your name',
                'Solid-color name styling',
                'Discord supporter role',
                'First look at every new feature',
            ],
            cta: 'Start at Tier 1',
            variant: 'default' as const,
            preview: { prefs: tier1Preview, tier: 1, label: 'Solid color' },
        },
        {
            name: 'Tier 2',
            tagline: 'The sweet spot',
            highlights: [
                'Everything in Tier 1',
                'Daily snapshots kept 180 days',
                'Gradient name styling',
            ],
            cta: 'Choose Tier 2',
            variant: 'highlighted' as const,
            badge: 'Most popular',
            preview: { prefs: tier2Preview, tier: 2, label: 'Gradient' },
        },
        {
            name: 'Tier 3',
            tagline: 'Preserve everything',
            highlights: [
                'Everything in Tier 2',
                <strong key="k">
                    Daily snapshots kept <em>forever</em>
                </strong>,
                'Animated, stylized name effects',
                'My eternal thanks and gratitude',
            ],
            cta: 'Support at Tier 3',
            variant: 'premium' as const,
            badge: 'Maximum impact',
            preview: {
                prefs: tier3Preview,
                tier: 3,
                label: 'Animated + stylized',
            },
        },
    ];

    return (
        <section className={styles.tiersSection}>
            <header className={styles.sectionHead}>
                <p className={styles.sectionKicker}>Pick your tier</p>
                <h2 className={styles.sectionTitle}>
                    Three ways to help, one goal
                </h2>
                <p className={styles.sectionLead}>
                    Any tier keeps the site running. Higher tiers unlock longer
                    backup retention and a few extra thank-yous. All prices and
                    tiers are managed through Patreon.
                </p>
            </header>

            <div className={styles.tierGrid}>
                {tiers.map((tier) => (
                    <article
                        key={tier.name}
                        className={`${styles.tierCard} ${
                            styles[`tierCard_${tier.variant}`]
                        }`}
                    >
                        {tier.badge && (
                            <span className={styles.tierBadge}>
                                {tier.badge}
                            </span>
                        )}
                        <div className={styles.tierHead}>
                            <h3 className={styles.tierName}>{tier.name}</h3>
                            <p className={styles.tierTagline}>{tier.tagline}</p>
                        </div>
                        {tier.preview && (
                            <div className={styles.tierPreview}>
                                <div className={styles.tierPreviewLabel}>
                                    Name preview · {tier.preview.label}
                                </div>
                                <div className={styles.tierPreviewName}>
                                    <PatreonName
                                        name={PREVIEW_NAME}
                                        preferences={tier.preview.prefs}
                                        tier={tier.preview.tier}
                                        icon={true}
                                        size={18}
                                    />
                                </div>
                            </div>
                        )}
                        <ul className={styles.tierList}>
                            {tier.highlights.map((h, i) => (
                                <li key={i} className={styles.tierItem}>
                                    <span
                                        className={styles.tierCheck}
                                        aria-hidden="true"
                                    >
                                        ✓
                                    </span>
                                    <span>{h}</span>
                                </li>
                            ))}
                        </ul>
                        <Link
                            target="_blank"
                            rel="noreferrer"
                            href={patreonUrl}
                            className={`btn ${
                                tier.variant === 'default'
                                    ? 'btn-outline-primary'
                                    : 'btn-primary'
                            } ${styles.tierCta}`}
                        >
                            {tier.cta}
                        </Link>
                    </article>
                ))}
            </div>
        </section>
    );
}

function WhyItMatters() {
    return (
        <section className={styles.whySection}>
            <div className={styles.whyInner}>
                <div className={styles.whyIcon} aria-hidden="true">
                    <Heart size={32} />
                </div>
                <h2 className={styles.sectionTitle}>Why supporters matter</h2>
                <div className={styles.whyCopy}>
                    <p>
                        therun.gg exists because speedrunners deserve a home for
                        their splits that <em>isn't</em> trying to monetize
                        them. No ads scraping your screen. No analytics feeding
                        a data broker. No paywall gating basic stats.
                    </p>
                    <p>
                        The tradeoff: servers, storage, backups, and development
                        time all cost money. The only way this model works is if
                        the people who get the most value out of it chip in.
                    </p>
                    <p>
                        If therun.gg has saved you even one moment — finding
                        where you're losing time in a new category, pulling back
                        a splits file you'd overwritten, showing off your run
                        history to someone new — that's what your support funds.
                        It's what keeps the lights on for the next speedrunner
                        who's about to discover all of it for the first time.
                    </p>
                </div>
            </div>
        </section>
    );
}

function PatronsWall() {
    const { data: patreonData, isLoading } = usePatreons();

    if (isLoading || !patreonData) return null;

    const featured = Object.keys(patreonData).filter((key) => {
        const pref = patreonData[key];
        if (!pref.preferences) return true;
        if (pref.preferences.hide) return false;
        return pref.preferences.featureOnOverview;
    });

    if (featured.length === 0) return null;

    return (
        <section className={styles.wallSection}>
            <header className={styles.sectionHead}>
                <p className={styles.sectionKicker}>Thank you</p>
                <h2 className={styles.sectionTitle}>
                    The people keeping therun.gg alive
                </h2>
                <p className={styles.sectionLead}>
                    Every name here is someone who decided this site was worth
                    paying for so the rest of the community doesn't have to.
                </p>
            </header>
            <div className={styles.wallGrid}>
                {featured.map((key) => (
                    <div key={key} className={styles.wallItem}>
                        <UserLink username={key} />
                    </div>
                ))}
            </div>
        </section>
    );
}

function FinalCta({ session }: { session: { username: string } }) {
    return (
        <section className={styles.finalCta}>
            <div className={styles.finalCtaInner}>
                <PersonBadge
                    size={42}
                    className={styles.finalCtaIcon}
                    aria-hidden="true"
                />
                <h2 className={styles.finalCtaTitle}>
                    Keep therun.gg independent
                </h2>
                <p className={styles.finalCtaCopy}>
                    One Patreon tier a month keeps the servers humming, the
                    backups backing up, and the features coming.
                </p>
                <div className={styles.heroCtas}>
                    <Link
                        target="_blank"
                        rel="noreferrer"
                        href={patreonUrl}
                        className={`btn btn-primary btn-lg ${styles.heroCtaPrimary}`}
                    >
                        <FaPatreon size={18} />
                        <span>Become a Patron</span>
                    </Link>
                    <Link
                        target="_blank"
                        rel="noreferrer"
                        href={koFiUrl}
                        className={`btn btn-outline-primary btn-lg ${styles.heroCtaSecondary}`}
                    >
                        <SiKofi size={18} />
                        <span>Ko-fi</span>
                    </Link>
                    <Link
                        target="_blank"
                        rel="noreferrer"
                        href={paypalUrl}
                        className={`btn btn-outline-primary btn-lg ${styles.heroCtaSecondary}`}
                    >
                        <FaPaypal size={18} />
                        <span>PayPal</span>
                    </Link>
                    <Link
                        target="_blank"
                        rel="noreferrer"
                        href={stripePaymentButton}
                        className={`btn btn-outline-primary btn-lg ${styles.heroCtaSecondary}`}
                    >
                        <Stopwatch size={18} />
                        <span>Stripe</span>
                    </Link>
                </div>
                <p className={styles.finalCtaClaim}>
                    After a one-time donation, reach out on{' '}
                    <a href="/discord" target="_blank" rel="noreferrer">
                        Discord
                    </a>{' '}
                    or <a href="/contact">contact me</a> and I'll grant your
                    supporter perks manually.
                </p>
                {session.username && (
                    <p className={styles.finalCtaClaim}>
                        Already supporting?{' '}
                        <a href="/change-appearance">Claim your perks →</a>
                    </p>
                )}
            </div>
        </section>
    );
}

export const PatreonBunnySvg = ({ size = 20, url = '/patron' }) => {
    return (
        <a
            href={url}
            target="_blank"
            rel="noreferrer"
            style={{ marginBottom: '4%' }}
        >
            <BunnyIcon size={size} />
        </a>
    );
};
