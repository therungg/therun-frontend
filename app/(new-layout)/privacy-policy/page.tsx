import Link from '~src/components/link';
import buildMetadata from '~src/utils/metadata';
import styles from '../styles/shared/content-page.module.scss';

export const metadata = buildMetadata({
    title: 'Privacy Policy',
    description:
        'What data The Run collects, why, and what you can do about it.',
});

export default function PrivacyPolicy() {
    const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

    return (
        <div className={styles.content}>
            <h1>Privacy Policy</h1>
            <p>Last updated: 2 September 2026</p>
            <p>
                The Run is a speedrun statistics site. To do that job it has to
                store data about you and your runs. This page explains what we
                keep, why, who else touches it, and how to get it changed or
                deleted. We have tried to write it so you can actually read it.
            </p>
            <p>
                The Run is operated from the Netherlands, so the GDPR applies.
                The person responsible for your data (the &quot;controller&quot;
                in GDPR terms) can be reached at{' '}
                <a href={`mailto:${email}`}>{email}</a>.
            </p>

            <h2>What we collect</h2>
            <h3>Account</h3>
            <ul>
                <li>
                    Your Twitch username, Twitch user ID and the email address
                    on your Twitch account. We get these when you log in with
                    Twitch.
                </li>
                <li>
                    If you link Patreon: your Patreon user ID and which tier you
                    are on. We don&apos;t see your payment details.
                </li>
                <li>
                    Whatever you put on your profile: display name, pronouns,
                    country, bio, social links, and so on. All of this is
                    optional and public.
                </li>
            </ul>
            <h3>Runs and splits</h3>
            <ul>
                <li>
                    Splits files you upload (from LiveSplit or similar) and
                    everything in them: split names, times, attempt history,
                    game and category names.
                </li>
                <li>
                    Live timer data if you use the LiveSplit integration. This
                    is sent while you run and shown on the live page in real
                    time.
                </li>
                <li>
                    Runs you submit to leaderboards: time, date, platform, video
                    link, description, and any variables the leaderboard asks
                    for.
                </li>
                <li>
                    Runs imported from speedrun.com at your request, plus the
                    public data that came with them.
                </li>
                <li>
                    If you moderate a leaderboard: the actions you take (verify,
                    reject, edit, remove) and when you took them.
                </li>
            </ul>
            <h3>Technical</h3>
            <ul>
                <li>
                    Server logs: your IP address, browser, the pages you
                    requested, and timestamps. These are kept for a short time
                    to debug problems and stop abuse.
                </li>
                <li>
                    A session cookie so you stay logged in, and a few preference
                    settings stored in your browser.
                </li>
                <li>If you email us, the email and whatever you put in it.</li>
            </ul>
            <p>We don&apos;t run ad trackers and we don&apos;t sell data.</p>

            <h2>Why we use it</h2>
            <p>
                GDPR wants us to name a legal basis for each thing. Here they
                are.
            </p>
            <ul>
                <li>
                    <strong>To run the service you signed up for.</strong>{' '}
                    Account data, splits, runs, live data, profile. Without
                    these there is no site. Basis: contract.
                </li>
                <li>
                    <strong>To show public leaderboards and stats.</strong> Run
                    times and the name of the runner are public by nature; that
                    is what a leaderboard is. This includes runs by people
                    without an account, taken from public sources. Basis:
                    legitimate interest. You can object, see below.
                </li>
                <li>
                    <strong>To keep the site working and safe.</strong> Logs,
                    rate limiting, cheat detection, moderation history. Basis:
                    legitimate interest.
                </li>
                <li>
                    <strong>To give supporter perks.</strong> Patreon tier.
                    Basis: contract.
                </li>
                <li>
                    <strong>To answer you.</strong> Your email when you write to
                    us. Basis: legitimate interest.
                </li>
            </ul>
            <p>We don&apos;t use your data for marketing.</p>

            <h2>Who else sees it</h2>
            <p>
                We use a few outside services to run the site. They only get
                what they need for their job.
            </p>
            <ul>
                <li>
                    <strong>Amazon Web Services</strong> (Ireland) stores the
                    database and files.
                </li>
                <li>
                    <strong>Vercel</strong> hosts the website and keeps the
                    server logs.
                </li>
                <li>
                    <strong>Twitch</strong> handles login. Their privacy policy
                    covers what they do with your Twitch account.
                </li>
                <li>
                    <strong>Patreon</strong> handles supporter payments and
                    tells us your tier.
                </li>
                <li>
                    <strong>Algolia</strong> powers search. It gets game and
                    user names so they can be searched.
                </li>
                <li>
                    <strong>YouTube and Twitch</strong> embeds load when you
                    open a page with a video. Those embeds can set their own
                    cookies.
                </li>
                <li>
                    <strong>IGDB</strong> supplies game names and box art. No
                    user data goes to them.
                </li>
            </ul>
            <p>
                Apart from these, we don&apos;t give your data to anyone unless
                the law makes us.
            </p>

            <h2>Public by design</h2>
            <p>
                Be aware that a lot of what you put on The Run is meant to be
                seen. Your profile, your runs, your splits stats, and your
                leaderboard entries are visible to anyone, without logging in,
                and search engines index them. Your email, IP address and
                Patreon details are never shown publicly.
            </p>

            <h2>How long we keep it</h2>
            <ul>
                <li>
                    Account, runs and splits: as long as you have an account.
                </li>
                <li>Server logs: a few weeks, then they are gone.</li>
                <li>Emails: as long as needed to deal with what you asked.</li>
                <li>
                    After you delete your account: your personal data is
                    removed. Runs that were verified on a public leaderboard
                    stay on it without your name, so the history of that
                    leaderboard doesn&apos;t get holes in it. If you want a
                    specific run gone entirely, ask.
                </li>
            </ul>

            <h2>Your rights</h2>
            <p>
                Under the GDPR you can ask us to: show you what we have on you,
                fix it, delete it, stop processing it, hand it over in a usable
                format, or object to us using it. Email{' '}
                <a href={`mailto:${email}`}>{email}</a> and we will sort it out.
                We aim to answer within a month, and we don&apos;t charge for
                it.
            </p>
            <p>
                For a lot of this you don&apos;t need to email. You can edit
                your profile, remove runs and splits, and unlink Patreon from
                your <Link href="/settings">settings page</Link>. Account
                deletion is by email for now.
            </p>
            <p>
                If you think we are handling your data wrong and we can&apos;t
                fix it between us, you can complain to the Dutch data protection
                authority, the Autoriteit Persoonsgegevens, at{' '}
                <a
                    href="https://www.autoriteitpersoonsgegevens.nl"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    autoriteitpersoonsgegevens.nl
                </a>
                .
            </p>

            <h2>Cookies</h2>
            <p>
                We use one cookie of our own, to keep you logged in. Preferences
                like theme or timing mode are stored in your browser&apos;s
                local storage and never leave it. Video embeds from YouTube and
                Twitch may set their own cookies when you play a video. We
                don&apos;t have advertising or tracking cookies, which is why
                there is no cookie banner.
            </p>

            <h2>Changes</h2>
            <p>
                If this policy changes in a way that matters, we will say so on
                the site. The date at the top is the last time it was edited.
            </p>
        </div>
    );
}
