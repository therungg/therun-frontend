import { BackLink } from '~app/(new-layout)/games/[game]/shared/back-link';
import Link from '~src/components/link';
import buildMetadata from '~src/utils/metadata';
import { LegalToc } from '../components/legal/legal-toc';
import {
    OPEN_DATA_LICENCE_DATE,
    SRC_ARCHIVE_URL,
} from '../components/open-data-licence';
import styles from '../styles/shared/content-page.module.scss';

export const metadata = buildMetadata({
    title: 'Privacy Policy',
    description:
        'What data The Run collects, why, and what you can do about it.',
});

const SECTIONS = [
    { id: 'what-we-collect', title: 'What we collect' },
    { id: 'why', title: 'Why we use it' },
    { id: 'who-else', title: 'Who else sees it' },
    { id: 'public-by-design', title: 'Public by design' },
    { id: 'data-reuse', title: 'Reuse of leaderboard data' },
    { id: 'how-long', title: 'How long we keep it' },
    { id: 'your-rights', title: 'Your rights' },
    { id: 'cookies', title: 'Cookies' },
    { id: 'changes', title: 'Changes' },
];

export default function PrivacyPolicy() {
    const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

    return (
        <div className={`${styles.content} ${styles.legal}`}>
            <BackLink href="/games" label="Back to leaderboards" />
            <h1>Privacy Policy</h1>
            <p className={styles.meta}>
                Last updated: {OPEN_DATA_LICENCE_DATE}. In effect since{' '}
                {OPEN_DATA_LICENCE_DATE}. Before that, the{' '}
                <Link href="/privacy-policy/2026-10-03">previous version</Link>{' '}
                applied.
            </p>

            <section className={styles.notice} aria-labelledby="privacy-change">
                <h2 id="privacy-change" className={styles.noticeTitle}>
                    What changed on {OPEN_DATA_LICENCE_DATE}
                </h2>
                <p>
                    Leaderboard data on The Run is under CC BY-NC 4.0, so others
                    can reuse your runs and race results non-commercially, with
                    your username. We don&apos;t publish a download of
                    everything. Anyone can export one board at a time, and a
                    setting keeps your name out of exports. Runs from the
                    speedrun.com archive are on the site, and a speedrun.com
                    profile can be linked to your account.{' '}
                    <a href="#data-reuse">How this works and why</a>.
                </p>
            </section>

            <p>
                The Run (therun.gg) is a speedrun statistics site. To do that it
                has to store data about you and your runs. This page says what
                we keep and why, who else gets it, and how to have it changed or
                deleted.
            </p>
            <p>
                The Run is run by Joey Hendriks, a private person in the
                Netherlands, so the GDPR applies. He is responsible for your
                data (the &quot;controller&quot; in GDPR terms). You can reach
                him at <a href={`mailto:${email}`}>{email}</a>. Postal address
                available on request. Accounts are for people aged 16 or older,
                or 13 to 15 with a parent&apos;s or guardian&apos;s permission.
                See the <Link href="/terms#your-account">terms</Link>.
            </p>

            <LegalToc sections={SECTIONS} />

            <h2 id="what-we-collect">What we collect</h2>
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
                    Live timer data if you use the LiveSplit integration. It is
                    sent while you run and shown live on the site.
                </li>
                <li>
                    Runs you submit to leaderboards: time, date, platform, video
                    link, description, and any variables the leaderboard asks
                    for.
                </li>
                <li>
                    Runs you import from your speedrun.com export. Runs from
                    speedrun.com that we fetched until 1&nbsp;October&nbsp;2026
                    or took from the{' '}
                    <a
                        href={SRC_ARCHIVE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        speedrun.com archive of October 2026
                        <span className="visually-hidden">
                            {' '}
                            (opens in a new tab)
                        </span>
                    </a>
                    , uploaded to the Internet Archive. That archive is public
                    and holds speedrun.com&apos;s data as it was before
                    1&nbsp;October&nbsp;2026, 22:42 UTC. For those we keep the
                    runner&apos;s speedrun.com name and user id, the run times,
                    dates, platform, region, video links and comments, and the
                    other players on the run. From the archive we also keep the
                    Twitch login on the runner&apos;s speedrun.com profile,
                    stored as a hash, and the moderator lists (who moderated
                    which game on speedrun.com). The YouTube and Twitter links
                    and the country the archive lists for runners are read
                    during an import and not kept. They are deleted right after
                    every import.
                </li>
                <li>
                    If you import from a speedrun.com data export: the runs from
                    that file, for 30 days, so an admin can check them. The file
                    also holds your email address, your messages and your
                    settings. We take the runs out when you upload it and throw
                    the rest away. The runs wait 30 days and are then deleted;
                    only the runs taken into the site stay.
                </li>
                <li>
                    Runs a moderator adds for someone without an account: the
                    name the run is credited to, the time, date, platform, video
                    link and the board it is on, taken from where the run is
                    public (YouTube, Twitch, or the runner).
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
                    requested, and timestamps. These are kept up to one month on
                    AWS, to debug problems and stop abuse. Vercel keeps its own
                    for a few days at most.
                </li>
                <li>
                    A session cookie so you stay logged in, and a few preference
                    settings stored in your browser.
                </li>
                <li>If you email us, the email and whatever you put in it.</li>
            </ul>
            <p>We don&apos;t run ad trackers and we don&apos;t sell data.</p>

            <h2 id="why">Why we use it</h2>
            <p>
                The GDPR asks for a legal basis for each of these, so we list
                one with each.
            </p>
            <ul>
                <li>
                    <strong>To run the service you signed up for.</strong>{' '}
                    Account data, splits, runs, live data and your profile,
                    which the site can&apos;t work without. Basis: contract.
                </li>
                <li>
                    <strong>To show public leaderboards and stats.</strong> A
                    leaderboard is run times with the runners&apos; names, so
                    these are public. This includes runs by people without an
                    account, taken from public sources like the speedrun.com
                    archive. Basis: legitimate interest. You can object, see
                    below.
                </li>
                <li>
                    <strong>
                        To give you your runs from the speedrun.com archive.
                    </strong>{' '}
                    When you log in, we compare your Twitch account with the
                    Twitch link on archived speedrun.com profiles. If they
                    match, we link that profile to your account and its runs
                    show under your name. A board&apos;s moderators or our
                    admins can also link a speedrun.com profile to an account
                    here when the runs show it is the same person. A link shows
                    publicly that both names belong to one person. You get a
                    notice each time, and you can undo the link in your import
                    settings. We then don&apos;t match you with that profile
                    again. Basis: legitimate interest.
                </li>
                <li>
                    <strong>
                        The Twitch login and the moderator lists from the
                        speedrun.com archive.
                    </strong>{' '}
                    To match runs to accounts here, and to know who moderated a
                    board when someone applies to moderate it here. Basis:
                    legitimate interest.
                </li>
                <li>
                    <strong>To keep the site working and safe.</strong> Logs,
                    rate limiting, cheat detection, moderation history. Basis:
                    legitimate interest.
                </li>

                <li>
                    <strong>To check imports.</strong> The runs taken from the
                    speedrun.com export you uploaded, to fix an import that went
                    wrong and to look into one that claims somebody else&apos;s
                    runs. Basis: legitimate interest.
                </li>
                <li>
                    <strong>Your email address from Twitch.</strong> To match a
                    Patreon pledge to your account and to contact you about your
                    account when we must (a deletion request, a legal notice).
                    Basis: contract for the Patreon part, legitimate interest
                    for the rest.
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

            <h2 id="who-else">Who else sees it</h2>
            <p>
                We use a few outside services to run the site, and each gets
                only what it needs.
            </p>
            <ul>
                <li>
                    <strong>Amazon Web Services</strong> (Ireland) runs the
                    backend and stores files.
                </li>
                <li>
                    <strong>Supabase</strong> (Ireland) hosts the database.
                </li>
                <li>
                    <strong>Redis Cloud</strong> (Ireland) keeps short-lived
                    copies of leaderboard and live data, to make the site fast.
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
                    <strong>Algolia</strong> powers search. It gets game names,
                    usernames and runs (game, category, runner) so they can be
                    searched.
                </li>
                <li>
                    <strong>Discord.</strong> PB announcements and race updates,
                    with usernames, are posted to our Discord server.
                </li>
                <li>
                    <strong>YouTube and Twitch</strong> players. A Twitch player
                    loads when you open a page with a stream or a Twitch video
                    on it. Twitch then sees your IP address and can set cookies.
                    YouTube videos load in YouTube&apos;s no-cookie mode and
                    only set cookies when you press play.
                </li>
                <li>
                    <strong>IGDB</strong> supplies game names and box art. Game
                    box art loads from IGDB and profile pictures from Twitch, so
                    your IP address reaches them when a page shows those images,
                    like any image on the web.
                </li>
                <li>
                    <strong>Google</strong> handles our email, so what you write
                    to us is on Google&apos;s servers.
                </li>
                <li>
                    <strong>Board moderators and our admins</strong> see what
                    they need to moderate: your runs, splits, videos and notes,
                    and the speedrun.com links we keep for matching. They are
                    volunteers, bound by our <Link href="/terms">terms</Link>.
                </li>
            </ul>
            <p>
                Vercel, Amazon Web Services, Twitch (which owns IGDB), Patreon,
                Algolia, Discord, Supabase, Redis Cloud and Google are companies
                outside the EU, so some of your data can leave the EU. For each
                of them: EU-US Data Privacy Framework where the company is
                certified, with standard contractual clauses as the fallback; a
                copy of the clauses is available on request. An appeal against
                the Data Privacy Framework is pending at the EU Court of
                Justice; the contract clauses stay in place whatever happens to
                it.
            </p>
            <p>
                Apart from these, and the board exports described below, we
                don&apos;t give your data to anyone unless the law makes us.
            </p>

            <h2 id="public-by-design">Public by design</h2>
            <p>
                A lot of what you put on The Run is meant to be seen. Your
                profile, your runs, your splits stats, and your leaderboard
                entries are visible to anyone, without logging in, and search
                engines index them. If you support us on Patreon, people can see
                that (a badge, and your name in the supporter list). You can
                hide it in your{' '}
                <Link href="/settings/appearance">appearance settings</Link>.
                Your email and IP address are never shown publicly.
            </p>
            <h2 id="data-reuse">Reuse of leaderboard data</h2>
            <p>
                Leaderboard data on The Run is under CC BY-NC 4.0, so anyone can
                reuse it non-commercially with credit. The{' '}
                <Link href="/terms#data-licence">terms</Link> say what that
                covers. About you, that is your username next to your runs and
                race results, your race ratings, and the links to your run
                videos, which usually lead to your channel. All of that is
                already public on the site. We don&apos;t publish a download of
                everything. Anyone can export one board at a time with the
                Export button on a leaderboard page. That file has the runs on
                that board with the runners&apos; names, times, dates and video
                links. Runs marked as from speedrun.com are not in it. Basis:
                legitimate interest (article 6(1)(f) GDPR). If you turn off
                &quot;Show my name in exports&quot; in your{' '}
                <Link href="/settings/preferences">preferences</Link>, your runs
                are in exports as &quot;Anonymous&quot;, without video links.
                You don&apos;t need a reason. Your name stays on the site, so
                someone who compares an export with the site can still tell
                which runs are yours. The licence is about the content. It gives
                nobody a right to use your personal data. Whoever reuses a
                result with your name on it answers for that under privacy law.
            </p>
            <p>
                If you delete a run, it leaves the site. If you delete your
                account, your runs stay on the site without your name, unless
                you chose to take them off the leaderboards when deleting. Their
                video links and descriptions are removed. Email us if you want
                the runs gone completely.
            </p>
            <p>
                Runs of people without an account are on the site too, under the
                name they are credited with, when the run came from a public
                source like YouTube or Twitch. Runs from speedrun.com, fetched
                until 1&nbsp;October&nbsp;2026 or taken from the archive, are on
                it as well. The basis for both is legitimate interest. If one of
                those runs is yours, email us and we take it out or change the
                name.
            </p>
            <p>
                We cannot tell the runners in the archive one by one; there are
                hundreds of thousands and we have no contact details. This
                policy, the notice on their runs and profile pages, and the
                announcement on the site are how we inform them (article
                14(5)(b) GDPR).
            </p>
            <p>
                We can&apos;t take back copies someone already made of a public
                page. If you think we got this wrong, tell us, or complain to
                the Autoriteit Persoonsgegevens (see{' '}
                <a href="#your-rights">Your rights</a>).
            </p>

            <h2 id="how-long">How long we keep it</h2>
            <ul>
                <li>Account data: as long as you have an account.</li>
                <li>
                    Runs on leaderboards and race results: they stay after you
                    delete your account, under an anonymous name, unless you
                    chose to take them off the leaderboards when deleting. Their
                    video links and descriptions are removed.
                </li>
                <li>
                    Your world record history: stays with its time and date,
                    without your name, in both cases. A dated record can still
                    be recognised, so email us if you want it erased too.
                </li>
                <li>
                    Runs of people without an account, including runs from the
                    speedrun.com archive: as long as the leaderboard is on the
                    site, or until the runner asks us to remove them.
                </li>
                <li>
                    Twitch handles from the archive are stored as a hash, used
                    only to match runs to accounts, and deleted 2 years after
                    the import. Moderator lists from the archive: 2 years after
                    the import.
                </li>

                <li>
                    Server logs: up to one month on AWS; Vercel keeps its own
                    for a few days at most.
                </li>
                <li>
                    Runs from speedrun.com export files: 30 days from the
                    upload, then they are deleted. The file itself is not kept.
                </li>
                <li>Emails: as long as needed to deal with what you asked.</li>
            </ul>

            <h2 id="your-rights">Your rights</h2>
            <p>
                Under the GDPR you can ask us to: show you what we have on you,
                fix it, delete it, stop processing it, hand it over in a usable
                format, or object to us using it. Email{' '}
                <a href={`mailto:${email}`}>{email}</a>. We answer within a
                month, which is the legal deadline. If a request is complex we
                can take up to two more months, and we tell you if so. We
                don&apos;t charge for it.
            </p>
            <p>
                Most of this you can do yourself. You can edit your profile,
                remove runs and splits, and unlink Patreon from your{' '}
                <Link href="/settings">settings page</Link>, and delete your
                account in your{' '}
                <Link href="/settings/account">account settings</Link>. After
                that, your world record history stays without your name. A dated
                record can still be recognised, so email us if you want it
                erased too. To keep your name out of board exports, turn off
                &quot;Show my name in exports&quot; in your{' '}
                <Link href="/settings/preferences">preferences</Link>.
            </p>
            <p>
                If your runs came from the speedrun.com archive and you have no
                account here, email us to have them removed or credited
                differently. If you make an account and your speedrun.com
                profile is linked to it, they become yours. You can then take
                them off the leaderboards from your profile, or ask us to delete
                them outright. To show a run is yours, log in with the Twitch
                account on the speedrun.com profile that holds it (the profile
                is then linked to your account, and you confirm it in your
                import settings), upload your own speedrun.com export, or email
                us with the video or the account that posted the run.
            </p>
            <p>
                If you were under 16 when a run of yours was posted, or you are
                a parent of a runner who is, we remove it or take the name off
                when you ask.
            </p>
            <p>
                You can complain to the Autoriteit Persoonsgegevens at any time,
                or to the data protection authority of the country you live in.
                The Dutch one is at{' '}
                <a
                    href="https://www.autoriteitpersoonsgegevens.nl"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    autoriteitpersoonsgegevens.nl
                </a>
                .
            </p>

            <h2 id="cookies">Cookies</h2>
            <p>
                We set one cookie of our own, to keep you logged in. Preferences
                like theme or timing mode are stored in your browser&apos;s
                local storage and never leave it. Twitch players can set
                Twitch&apos;s own cookies as soon as a page with one loads.
                YouTube videos only do that when you press play. We don&apos;t
                have advertising or tracking cookies of our own.
            </p>

            <h2 id="changes">Changes</h2>
            <p>
                We may change this policy. A change applies from the day we
                publish it here, and the date at the top says when. If it
                matters, we also say so on the site, and usually on Discord and
                social media too.
            </p>
        </div>
    );
}
