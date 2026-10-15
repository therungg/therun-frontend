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
    title: 'Terms of Service',
    description:
        'The rules for using The Run, including the data licence and how moderation decisions are reviewed.',
});

const SECTIONS = [
    { id: 'your-account', title: 'Your account' },
    { id: 'what-you-upload', title: 'What you upload and submit' },
    { id: 'importing', title: 'Importing runs from speedrun.com' },
    { id: 'data-licence', title: 'Data licence' },
    { id: 'moderation', title: 'Leaderboards and moderation' },
    { id: 'scraping-and-ai', title: 'Scraping and AI' },
    { id: 'the-site', title: 'The site itself' },
    { id: 'reporting', title: 'Reporting content' },
    { id: 'changes', title: 'Changes and disputes' },
];

const EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

export default function Terms() {
    return (
        <div className={`${styles.content} ${styles.legal}`}>
            <BackLink href="/games" label="Back to leaderboards" />
            <h1>Terms of Service</h1>
            <p className={styles.meta}>
                Last updated: {OPEN_DATA_LICENCE_DATE}. In effect since{' '}
                {OPEN_DATA_LICENCE_DATE}. Before that, the{' '}
                <Link href="/terms/2026-09-02">previous version</Link> applied.
            </p>

            <section className={styles.notice} aria-labelledby="terms-change">
                <h2 id="terms-change" className={styles.noticeTitle}>
                    What changed on {OPEN_DATA_LICENCE_DATE}
                </h2>
                <p>
                    These terms apply from that day. Leaderboard data on The Run
                    is under CC BY-NC 4.0: the runs and race results the boards
                    show, and how the boards are set up. Anyone can reuse it
                    non-commercially if they credit The Run, and speedrun.com
                    for the runs and board setups marked as from speedrun.com.
                    We don&apos;t publish a download of the data. The Export
                    button on a leaderboard gives one board at a time, and a
                    setting in your preferences keeps your name out of exports.
                    If you delete your account, your runs stay on the site
                    without your name. Runs from the speedrun.com archive are on
                    the site too. If your Twitch account is on the speedrun.com
                    profile that posted them, they show under your name here.
                    You confirm or undo that in your import settings. Once you
                    confirm, or upload your own export, they are yours, under
                    the same licence as your other runs.{' '}
                    <a href="#data-licence">What the licence covers</a>.
                </p>
                <p>
                    Other changes: the privacy policy is now separate from these
                    terms. You can have an account from 13 with a parent&apos;s
                    permission. Board moderators can add someone else&apos;s run
                    if it is already public. Deleting your account now also
                    removes your video links and descriptions. Moderation
                    decisions come with a reason and you can ask for a review.
                    There is a new section on scraping and AI. The liability and
                    governing law rules were rewritten so they don&apos;t take
                    away rights the law gives you. We no longer fetch anything
                    from speedrun.com. One licence, CC BY-NC 4.0, covers all
                    leaderboard data, your runs and the speedrun.com runs alike.
                </p>
            </section>

            <p>
                The Run (therun.gg) is a free site for speedrun statistics and
                leaderboards. These are the rules for using it. By using the
                site, you agree to them.
            </p>
            <p>
                The Run is run by Joey Hendriks, a private person in the
                Netherlands. He is the other party to these terms, and
                &quot;we&quot; and &quot;us&quot; mean him. Postal address
                available on request.
            </p>
            <p>
                How we handle your data is in the separate{' '}
                <Link href="/privacy-policy">privacy policy</Link>.
            </p>

            <LegalToc sections={SECTIONS} />

            <h2 id="your-account">Your account</h2>
            <ul>
                <li>
                    You log in with Twitch. We read your Twitch username and
                    email address when you do. We don&apos;t get your Twitch
                    password.
                </li>
                <li>
                    You need to be at least 16 to have an account, or 13 to 15
                    with permission from a parent or guardian. No accounts under
                    13.
                </li>
                <li>
                    You are responsible for what happens on your account. Keep
                    your Twitch login safe.
                </li>
                <li>
                    You can link a Patreon account to unlock supporter perks.
                    Payments and refunds go through Patreon. Perks depend on
                    your tier and can change over time. No perk touches the data
                    from speedrun.com or any other data on the site: perks are
                    cosmetic.
                </li>
            </ul>

            <h2 id="what-you-upload">What you upload and submit</h2>
            <p>
                Almost everything on The Run is data you and other runners put
                there: splits files, run submissions, video links, profile
                details, leaderboard settings, comments and so on. We call all
                of this &quot;your content&quot;.
            </p>
            <ul>
                <li>
                    You keep whatever rights you have in your content. These
                    terms don&apos;t transfer them to us, they only give us the
                    permissions described here.
                </li>
                <li>
                    By uploading or submitting it, you let us store it, process
                    it, show it on the site, and use it in statistics and
                    leaderboards, including on public pages that anyone can see
                    and search engines can index. Leaderboard data is under CC
                    BY-NC 4.0. See the <a href="#data-licence">data licence</a>.
                </li>
                <li>
                    Submit your own runs. Board moderators can also add someone
                    else&apos;s run if it is already public, like on YouTube or
                    Twitch, or if the runner said they could. They take it from
                    that source or from the runner, never from speedrun.com.
                    Copying runs you don&apos;t own from speedrun.com is not
                    allowed. That run belongs to the runner it is about, not to
                    the moderator and not to us. We show it because it is
                    already public. The runner can claim it, change it or have
                    it removed at any time.
                </li>
                <li>
                    Don&apos;t upload anything you don&apos;t have the right to
                    share, and nothing illegal, hateful or harassing. What you
                    upload is your responsibility, not ours. If you upload
                    something you were not allowed to, like data taken from
                    speedrun.com, that is between you and whoever you took it
                    from. We remove it when we learn about it and may close your
                    account. If someone makes a claim against us because of
                    something you uploaded against these rules, you answer for
                    it, including the costs.
                </li>
                <li>
                    You can take any of your runs off the leaderboards yourself,
                    from your profile or from the run page, and put it back
                    later.
                </li>
                <li>
                    You can delete your account at any time in your{' '}
                    <Link href="/settings/account">account settings</Link>. Your
                    private account data is removed. Runs on public leaderboards
                    and race results stay, but under an anonymous name instead
                    of yours, so the leaderboard history stays intact for
                    everyone else. Their video links are removed from the site,
                    because a video usually shows who you are, and their
                    descriptions are removed from the site. When you delete your
                    account you can choose to take all your runs off the
                    leaderboards at the same time. In both cases your world
                    record history stays, with its time and date, without your
                    name. A dated record can still be recognised, so email us if
                    you want it erased too.
                </li>
            </ul>

            <h2 id="importing">Importing runs from speedrun.com</h2>
            <p>
                We don&apos;t request anything from speedrun.com. Not through
                its API, not through its website, not on your behalf. We stopped
                on 1&nbsp;October&nbsp;2026 and have not started again. The same
                goes for you: don&apos;t copy anything from speedrun.com to The
                Run, by hand, with a tool or in any other way, unless it is your
                own content. We don&apos;t check anything on The Run against
                speedrun.com, not a run, not a time, not a name. Neither do
                admins, or moderators while they are moderating here. We
                don&apos;t ask anyone else to. What is on The Run from
                speedrun.com came from two places: what we fetched until
                1&nbsp;October&nbsp;2026, and the{' '}
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
                , uploaded to the Internet Archive. To our understanding, the
                original content speedrun.com published under its old terms was
                under CC BY-NC 4.0, and that licence cannot be withdrawn. See{' '}
                <a
                    href="https://web.archive.org/web/20210801064232/https://www.speedrun.com/pages/terms-of-use"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    speedrun.com&apos;s terms of use at the time (archived copy)
                    <span className="visually-hidden">
                        {' '}
                        (opens in a new tab)
                    </span>
                </a>
                . Speedrun.com announced new terms on 1&nbsp;October&nbsp;2026.
                Its terms page says 30&nbsp;September. We don&apos;t know the
                exact moment the old terms stopped applying. We stopped fetching
                on 1&nbsp;October&nbsp;2026, the day we saw the new terms. The
                archive holds speedrun.com as it was before
                1&nbsp;October&nbsp;2026, 22:42 UTC. If a run in it was
                published after the old terms ended and it is not yours to
                bring, tell us and we take it down. Nothing speedrun.com
                published under its new terms may come here, from us or from
                you, except your own content. Your own runs are yours to bring
                and to license, whenever you posted them. The archive is public
                and was not made by us. You can also upload the export
                speedrun.com gives you of your own account, in your{' '}
                <Link href="/settings/import">import settings</Link>. That file
                is your own data. If you are in the EU, you have the right to
                take it with you and use it here (GDPR article 20). Outside the
                EU, speedrun.com&apos;s terms may say you can&apos;t upload it
                to another site. Check that before you do; it is between you and
                speedrun.com.
            </p>
            <ul>
                <li>
                    Runs and board setups from those two places are marked as
                    from speedrun.com, unless the runner claimed them as
                    described below. They are shown with a credit to
                    speedrun.com, the CC BY-NC 4.0 licence and a link back. We
                    don&apos;t sell imported data or put it behind a paywall.
                </li>
                <li>
                    Runs from the archive are the runner&apos;s own words and
                    times, shown under the runner&apos;s name. Board rules
                    copied from the archive are credited to speedrun.com, and
                    the board&apos;s moderators can change them.
                </li>
                <li>
                    We changed some of it: runs that were unverified in the
                    archive are pending here, rejected runs are left out, and
                    moderators here can change rules and verification.
                </li>
                <li>
                    Runs from the archive are on every board. A board&apos;s
                    moderators decide when the speedrun.com categories and
                    variables are turned on, and they can take off their board
                    runs submitted here that ended before
                    1&nbsp;October&nbsp;2026, were never verified on
                    speedrun.com, and are still waiting for verification here.
                </li>
                <li>
                    If a run marked as from speedrun.com is yours, it becomes
                    your run here when you confirm it. When you log in with the
                    Twitch account linked on your speedrun.com profile, we link
                    that profile to your account. Its runs then show under your
                    name, with the speedrun.com credit. A board moderator or an
                    admin can link a profile to your account the same way. You
                    get a notice each time. In your{' '}
                    <Link href="/settings/import">import settings</Link> you
                    confirm the link or undo it with one click. If you undo it,
                    the runs go back under the speedrun.com name and we
                    don&apos;t match you with that profile again. Uploading your
                    own speedrun.com export confirms it too. The speedrun.com
                    credit stays until you confirm. By confirming you give us
                    the same permission for them as for a run you submit
                    yourself. It stays yours and stays under CC BY-NC 4.0. It
                    shows your name and a note that it was first posted on
                    speedrun.com, without the speedrun.com credit. You can take
                    these runs off the leaderboards from your profile, or ask us
                    to delete them outright. A run with more than one player
                    keeps the speedrun.com credit.
                </li>
                <li>
                    Only upload your own export, and only import runs that are
                    yours.
                </li>
                <li>
                    We take the runs out of every upload and don&apos;t keep the
                    file. An admin checks those runs before anything is
                    imported. If we refuse an import, we tell you why.
                </li>
                <li>
                    Imported runs are your content under these terms. You can
                    take them off the leaderboards from your profile, or ask us
                    to delete them outright. They are under the same licence as
                    your other runs, with a note that they were first posted on
                    speedrun.com.
                </li>
                <li>
                    Leaderboards on The Run may also contain runs by people who
                    don&apos;t have an account here, based on publicly available
                    data. If one of those runs is yours and you want it removed
                    or credited differently, contact us. To show a run is yours,
                    log in with the Twitch account on the speedrun.com profile
                    that holds it (the profile is then linked to your account,
                    and you confirm it in your import settings), upload your own
                    speedrun.com export, or email us with the video or the
                    account that posted the run.
                </li>
                <li>
                    Speedrun.com is not affiliated with The Run and has its own
                    rules.
                </li>
            </ul>

            <h2 id="data-licence">Data licence</h2>
            <p>
                The leaderboard data on The Run is under the{' '}
                <a
                    href="https://creativecommons.org/licenses/by-nc/4.0/"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Creative Commons Attribution-NonCommercial 4.0
                    <span className="visually-hidden">
                        {' '}
                        (opens in a new tab)
                    </span>
                </a>{' '}
                licence (CC BY-NC 4.0), the same licence speedrun.com data
                carried. That is every run and race result the boards show, and
                how the boards are set up. Anyone can reuse it non-commercially
                with credit. We don&apos;t publish a download of it. Runs and
                leaderboard setups from speedrun.com, fetched by us until
                1&nbsp;October&nbsp;2026 or taken from the speedrun.com archive
                as it was before 1&nbsp;October&nbsp;2026, 22:42 UTC, are marked
                as from speedrun.com and credited to it, unless the runner
                claimed them. For those, the licence comes from speedrun.com and
                the archive and we pass it on unchanged. We have not requested
                anything from speedrun.com since 1&nbsp;October&nbsp;2026.
                Patreon perks are cosmetic. None of them gives access to data,
                and nothing from speedrun.com is behind a perk.
            </p>
            <p>
                The licence covers the content, not the personal data in it.
                Creative Commons licences leave privacy rights out (section
                2(b)(1)), so the names, the Twitch, YouTube and Twitter links,
                the countries and the moderator lists that came with the archive
                are not licensed to anyone. We process them under privacy law,
                on the basis set out in the privacy policy, and so must anyone
                who uses the data.
            </p>
            <h3>What it covers</h3>
            <ul>
                <li>
                    Finished runs on public leaderboards. Per run: the board
                    (game, category or level, and the variable values), the
                    time, the date, platform and emulator, verification status,
                    the runner&apos;s name and the names of co-op partners, and
                    video links.
                </li>
                <li>
                    Runs you imported from your own speedrun.com export. They
                    count as your runs like any other, with a note that they
                    were first posted on speedrun.com.
                </li>
                <li>
                    Runs from speedrun.com, fetched by us until
                    1&nbsp;October&nbsp;2026 or taken from the archive, and
                    leaderboards whose setup was copied from there. These are
                    marked as from speedrun.com. A run whose runner uploaded
                    their own export, or whose speedrun.com account is linked to
                    an account here and confirmed, is their content instead,
                    with a note that it was first posted on speedrun.com.
                </li>
                <li>
                    Runs of people without an account, added from a public
                    source like YouTube or Twitch: the name they are credited
                    with, the time, date, platform, board and the video link.
                    Not the video itself.
                </li>
                <li>
                    Finished public races, with every runner&apos;s username,
                    place, time and rating.
                </li>
                <li>
                    How those leaderboards are set up: game names, categories,
                    levels and variables.
                </li>
            </ul>
            <h3>What it does not cover</h3>
            <ul>
                <li>
                    Splits, attempt history, live runs and stats made from them.
                </li>
                <li>
                    Videos themselves, run descriptions, profile pictures, rules
                    text, race descriptions and comments.
                </li>
                <li>
                    Your email, country and anything else from your account.
                </li>
                <li>
                    Runs that are rejected, held, hidden or removed. Races that
                    are private, hidden, test races or not finished.
                </li>
            </ul>
            <h3>Your runs</h3>
            <ul>
                <li>
                    When you upload or submit your own run, or join a race, you
                    let others reuse it under CC BY-NC 4.0, with your username,
                    and give the extra permission for videos, streams and
                    articles described below. Runs your timer uploads count too.
                    So do leaderboard setups you make or change as a moderator.
                </li>
                <li>
                    Adding someone else&apos;s run as a moderator doesn&apos;t
                    license anything for that runner. That run is covered as a
                    board entry only, like runs of people without an account.
                </li>
                <li>
                    Runs from before {OPEN_DATA_LICENCE_DATE} are covered too.
                    They were already public on the site.
                </li>
                <li>
                    There is a setting for your name in your{' '}
                    <Link href="/settings/preferences">preferences</Link>. Turn
                    off &quot;Show my name in exports&quot; and your runs are in
                    exports as &quot;Anonymous&quot;, without video links. Your
                    name stays on the site, so someone who compares the two can
                    still match your runs.
                </li>
                <li>
                    Removing a run takes it off the site. If you delete your
                    account, your runs stay on the site without your name.
                </li>
                <li>
                    If you have no account and a run here is yours, email us and
                    we remove it or change the name.
                </li>
                <li>
                    We can&apos;t take the licence back for data someone already
                    used under it.
                </li>
            </ul>
            <h3>If you use the data</h3>
            <ul>
                <li>
                    <strong>Export buttons.</strong> The Export buttons on
                    leaderboard pages give you one board at a time, under this
                    licence. Runs marked as from speedrun.com are left out of
                    exports. Runners who turned their name off are in them as
                    &quot;Anonymous&quot;. There is no download of everything.
                </li>
                <li>
                    <strong>Non-commercial.</strong> You can copy, share and
                    change the data for non-commercial use. Commercial use is
                    not allowed.
                </li>
                <li>
                    <strong>Credit.</strong> Credit it as &quot;Data from The
                    Run (therun.gg), CC BY-NC 4.0&quot;, link to The Run and the
                    licence, and say so if you changed it. Another credit that
                    meets the licence is fine. Runs and setups marked as from
                    speedrun.com are credited to speedrun.com, so credit
                    speedrun.com for those too.
                </li>
                <li>
                    You can show results in videos, streams, articles and
                    charts, monetised ones too, if you credit The Run. This is
                    an extra permission from us on top of the licence and only
                    covers data that is ours to give. Runs and setups marked as
                    from speedrun.com are credited to speedrun.com, so this
                    permission doesn&apos;t apply to them. You can&apos;t sell
                    the data or run a commercial site or app on a copy of it.
                </li>
                <li>
                    Don&apos;t suggest that The Run or a runner supports what
                    you make.
                </li>
                <li>
                    Privacy law still applies to you. The runners&apos; names
                    are personal data, so using the data to contact, profile or
                    track people needs its own legal basis. That is the law, not
                    a condition we add to the licence.
                </li>
                <li>
                    The data can have mistakes, and runs get corrected or
                    removed. The site shows the current state.
                </li>
                <li>
                    Don&apos;t collect the data from the site or the API in
                    bulk. See <a href="#scraping-and-ai">Scraping and AI</a>.
                </li>
            </ul>

            <h2 id="moderation">Leaderboards and moderation</h2>
            <ul>
                <li>
                    Leaderboards are run by volunteer moderators. They decide
                    which runs get verified, rejected or removed, and what the
                    rules for a game are. Moderators decide for their community.
                    We don&apos;t verify runs. Apart from the archive import and
                    export imports, we don&apos;t add them to boards either.
                    Moderators and runners do. We check imports from export
                    files and reports when they reach us. We are responsible for
                    how the review procedure works, not for what moderators add.
                    Their decisions stand unless they are changed on review.
                </li>
                <li>
                    Cheating, faking runs, splicing videos, or lying to
                    moderators gets your runs removed and can get you banned.
                </li>
                <li>
                    Moderators and we may look at your runs, splits and videos
                    to check they are genuine.
                </li>
                <li>
                    We can remove content, suspend or delete accounts, and
                    refuse service if you break these terms. If we ban you,
                    don&apos;t make a new account.
                </li>
                <li>
                    A moderator who rejects your run has to pick a reason, and
                    you see it on the run and in your notifications. If we
                    remove your run or other content, or restrict your account,
                    we tell you why as well.
                </li>
            </ul>

            <h3 id="review">Asking for a review</h3>
            <ul>
                <li>
                    If you think a decision about your run, your content or your
                    account is wrong, email{' '}
                    <a href={`mailto:${EMAIL}`}>{EMAIL}</a> within six months.
                    Say which decision it is and why you think it is wrong.
                </li>
                <li>
                    An admin of The Run looks at it again, where possible one
                    who was not involved in the decision. They can keep it,
                    change it or undo it. We aim to answer within a month and
                    tell you the outcome and why.
                </li>
                <li>
                    This review is the last step on The Run. You still have
                    every right the law gives you, like going to court.
                </li>
                <li>
                    A game&apos;s rules are up to its moderators. A review only
                    checks if the rules were applied correctly to your run.
                </li>
            </ul>

            <h2 id="scraping-and-ai">Scraping and AI</h2>
            <ul>
                <li>
                    Don&apos;t scrape the site, hammer the API, or try to get
                    around rate limits or access controls. If you want data in
                    bulk, ask.
                </li>
                <li>
                    Don&apos;t collect data or content from the site or the API,
                    automatically or in bulk, to train, test or improve AI
                    models, and don&apos;t let AI crawlers or agents collect it.
                    This doesn&apos;t cover individual facts you learn from
                    reading the site.
                </li>
                <li>
                    We reserve all rights to text and data mining of the site
                    and the API, as EU law allows (Article 4(3) of Directive
                    2019/790). Our robots.txt and the tdm-reservation header say
                    the same in machine-readable form.
                </li>
                <li>
                    This is about collecting data from the site and the API.
                    What you may do with leaderboard data is in the{' '}
                    <a href="#data-licence">data licence</a>.
                </li>
            </ul>

            <h2 id="the-site">The site itself</h2>
            <ul>
                <li>
                    The Run is a hobby project and is offered as-is. We try to
                    keep it up and accurate, but stats can be wrong, the site
                    can go down, and features can change or disappear without
                    notice.
                </li>
                <li>
                    Game names, box art and other game data come from third
                    parties and belong to their respective owners.
                </li>
                <li>
                    The site&apos;s own code, design, name and logo belong to
                    us. They are not under the data licence. Don&apos;t copy the
                    site or pretend to be it.
                </li>
                <li>
                    We link to other sites like Twitch and YouTube. What happens
                    there is between you and them.
                </li>
                <li>
                    To the extent the law allows, we are not liable for indirect
                    or consequential loss that comes from using the site or from
                    not being able to use it. Nothing in these terms limits
                    liability that the law does not allow us to limit or
                    exclude.
                </li>
            </ul>

            <h2 id="reporting">Reporting content</h2>
            <p>
                If you think something on The Run is illegal or breaks these
                rules, email <a href={`mailto:${EMAIL}`}>{EMAIL}</a> with a link
                to it and why. We answer and tell you what we did. Our contact
                point for authorities and for anyone under the Digital Services
                Act is Joey Hendriks at the same address.
            </p>

            <h2 id="changes">Changes and disputes</h2>
            <ul>
                <li>
                    We may change these terms. A change applies from the day we
                    publish it here. This page always has the current version,
                    and the date at the top says when it last changed. If the
                    change matters, we also say so on the site, and usually on
                    Discord and social media too. If you keep using the site
                    after a change, you accept it. If you don&apos;t, stop using
                    the site and delete your account.
                </li>
                <li>
                    Dutch law applies, except where mandatory law in the country
                    where you live says otherwise. You can bring a dispute to a
                    court where you live or to a Dutch court.
                </li>
                <li>
                    For questions, email <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
                    .
                </li>
            </ul>
        </div>
    );
}
