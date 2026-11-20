import { BackLink } from '~app/(new-layout)/games/[game]/shared/back-link';
import Link from '~src/components/link';
import buildMetadata from '~src/utils/metadata';
import { LegalToc } from '../components/legal/legal-toc';
import {
    OPEN_DATA_LICENCE_DATE,
    SRC_ARCHIVE_URL,
    SRC_SYNC_TERMS_DATE,
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
    { id: 'importing', title: 'Syncing with speedrun.com' },
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
                Last updated: {SRC_SYNC_TERMS_DATE}. In effect since{' '}
                {SRC_SYNC_TERMS_DATE}. Before that, the{' '}
                <Link href="/terms/2026-10-16">previous version</Link> applied.
            </p>

            <section className={styles.notice} aria-labelledby="terms-change">
                <h2 id="terms-change" className={styles.noticeTitle}>
                    What changed on {SRC_SYNC_TERMS_DATE}
                </h2>
                <p>
                    These terms apply from that day. We sync with speedrun.com
                    again, through its API, since speedrun.com opened up its
                    leaderboard data on 21&nbsp;October&nbsp;2026. You can link
                    your speedrun.com account and bring your runs over. We fetch
                    the leaderboards of games listed here that are linked to
                    speedrun.com and keep the runs on them. A linked game
                    without moderators starts as a copy of its speedrun.com
                    board. On a game with moderators, the board admins and
                    moderators choose whether their board shows them.
                    Leaderboard data and race results on The Run now have the
                    same licence terms as speedrun.com&apos;s: anyone can reuse
                    them for anything, commercially too, but not to train AI
                    models. That includes everything published before{' '}
                    {SRC_SYNC_TERMS_DATE}. That older data is still under CC
                    BY-NC 4.0 too, so it can be used under either.{' '}
                    <a href="#data-licence">What the licence covers</a>.
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
                    and search engines can index. Leaderboard data is under the
                    data licence. See the{' '}
                    <a href="#data-licence">data licence</a>.
                </li>
                <li>
                    Submit your own runs. Board moderators can also add someone
                    else&apos;s run if it is already public, like on YouTube,
                    Twitch or speedrun.com, or if the runner said they could.
                    That run belongs to the runner it is about, not to the
                    moderator and not to us. We show it because it is already
                    public. The runner can claim it, change it or have it
                    removed at any time. On a board that copies speedrun.com,
                    nobody can submit or add runs here.
                </li>
                <li>
                    Don&apos;t upload anything you don&apos;t have the right to
                    share, and nothing illegal, hateful or harassing. What you
                    upload is your responsibility, not ours. If you upload
                    something you were not allowed to, that is between you and
                    whoever you took it from. We remove it when we learn about
                    it and may close your account. If someone makes a claim
                    against us because of something you uploaded against these
                    rules, you answer for it, including the costs.
                </li>
                <li>
                    You can take any of your runs off the leaderboards yourself,
                    from your profile or from the run page, and put it back
                    later. That doesn&apos;t work on a board that copies
                    speedrun.com.
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

            <h2 id="importing">Syncing with speedrun.com</h2>
            <p>
                We request leaderboard data from speedrun.com through its API.
                We only take what speedrun.com&apos;s Leaderboard Data License
                covers: runs and what is recorded with them, and how its
                leaderboards are set up. We stopped on 1&nbsp;October&nbsp;2026,
                when speedrun.com&apos;s terms didn&apos;t allow it, and started
                again after its terms of 21&nbsp;October&nbsp;2026 did.
                Speedrun.com is not affiliated with The Run and doesn&apos;t
                endorse us.
            </p>
            <p>
                In your <Link href="/settings/import">import settings</Link> you
                can link your speedrun.com account. We find it through the
                Twitch channel on your speedrun.com profile, or by your name and
                a run you have on both sites. If neither works, you can give us
                your speedrun.com username and an admin checks it. Once linked,
                and once you tick the box, we bring over every run on that
                account, verified, pending and rejected, and the comments on
                your solo runs, and check for new and changed runs every day.
                You can turn the daily sync off or unlink at any time. Runs
                already brought over stay. You can take them off the
                leaderboards from your profile, or ask us to delete them.
            </p>
            <p>
                Your solo runs that come over this way are your runs here, under
                the same licence as your other runs, with a note that they were
                first posted on speedrun.com. A run with more than one player
                keeps the speedrun.com credit.
            </p>
            <p>
                For games listed here that are linked to speedrun.com, we fetch
                their leaderboards in the background. About every 5 minutes we
                check speedrun.com&apos;s list of newly verified runs, and when
                a run on a board is verified, we fetch that board as it is now.
                To catch changed and deleted runs, we fetch every board with
                speedrun.com runs again: every week on games with an upload here
                in the last 7 days, every month on games with one in the last 30
                days, and on other games only when one of their boards gets a
                new run.
            </p>
            <p>
                We no longer fetch runs that were never verified, or old PBs
                that the runner has since beaten. Runs we already have stay
                stored. A run the runner beat with a newer one also stays
                stored, off the board. A run removed or rejected on speedrun.com
                comes off our board when we next fetch that board. On a quiet
                game that can take a while.
            </p>
            <p>
                The runs we fetch include runners without an account here, under
                their speedrun.com name. We keep them whether a board shows them
                or not, except runs in speedrun.com categories the game
                doesn&apos;t have here. Today we use them to match runs from
                your timer to your runs on speedrun.com boards. We plan to use
                them for statistics too. We don&apos;t keep run comments,
                profile pictures or profile details from these fetches. A
                board&apos;s setup, its categories and variables, only comes
                over when a moderator runs the settings sync. A board that
                copies speedrun.com is the exception: it gets its setup in the
                background, every week on games with a recent upload here, every
                month on others, and when a new run shows up in a category it
                doesn&apos;t have yet.
            </p>
            <p>
                A board only shows speedrun.com runs when it is set to &quot;Add
                speedrun.com runs to this board&quot; or &quot;Copy the
                speedrun.com board&quot;. A game linked to speedrun.com that has
                no moderators starts as a copy of speedrun.com. That also goes
                for a game that gets linked later. On a game with moderators,
                the board admins and moderators choose. A board with moderators
                that showed speedrun.com runs on {SRC_SYNC_TERMS_DATE} starts on
                add. Boards that add or copy speedrun.com runs always take new
                ones. Moderators who don&apos;t want that can set their board to
                not connected. On other boards the runs we fetch stay off the
                board.
            </p>
            <ul>
                <li>
                    On a board that adds speedrun.com runs, they sit next to
                    runs from The Run and keep speedrun.com&apos;s verification.
                    Of the speedrun.com runs, only verified ones show.
                    Moderators here only review runs that were uploaded to The
                    Run and aren&apos;t on speedrun.com. They can still change
                    any run. If a run changes on speedrun.com after a moderator
                    here changed it, the moderator chooses which version stays.
                    A run removed or rejected on speedrun.com is taken off the
                    board, and a moderator can put it back.
                </li>
                <li>
                    A board that copies speedrun.com shows exactly what
                    speedrun.com&apos;s board shows: only runs verified there.
                    Runs from your timer still upload and count for your own
                    pages and statistics, but have no place on that board,
                    unless one matches a run verified on speedrun.com. Then it
                    shows as that run. Nobody on The Run can submit to it, or
                    verify, change or reject runs on it. Its categories, levels,
                    variables and rules follow speedrun.com by themselves. The
                    board says it is a copy.
                </li>
            </ul>
            <p>
                To check a board claim, we look at the game&apos;s moderator
                list on speedrun.com. We don&apos;t keep it.
            </p>
            <p>
                Before we started again, runs from speedrun.com came from two
                places: what we fetched until 1&nbsp;October&nbsp;2026, and the{' '}
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
                bring, tell us and we take it down. Your own runs are yours to
                bring and to license, whenever you posted them. The archive is
                public and was not made by us.
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
                    archive are stored as pending and stay off the boards,
                    rejected runs are left out, and moderators here can change
                    rules and verification, except on a board that copies
                    speedrun.com.
                </li>
                <li>
                    Runs from the archive only show on boards that add or copy
                    speedrun.com runs, and only when they are verified on
                    speedrun.com. Boards with moderators that showed them on{' '}
                    {SRC_SYNC_TERMS_DATE} keep them until the moderators change
                    that. A linked game without moderators starts as a copy, so
                    its archive runs that are verified on speedrun.com stay on
                    the board as part of the copy. On other boards we keep them
                    and don&apos;t show them. Only a copied board takes new
                    speedrun.com categories and variables by itself. On other
                    boards the admins and moderators choose what comes over, and
                    a game without moderators that isn&apos;t linked keeps the
                    categories it has. A board&apos;s moderators can take off
                    their board runs submitted here that ended before
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
                    don&apos;t match you with that profile again. The
                    speedrun.com credit stays until you confirm. By confirming
                    you give us the same permission for them as for a run you
                    submit yourself. It stays yours. It shows your name and a
                    note that it was first posted on speedrun.com, without the
                    speedrun.com credit. You can take these runs off the
                    leaderboards from your profile, or ask us to delete them
                    outright. A run with more than one player keeps the
                    speedrun.com credit.
                </li>
                <li>
                    Leaderboards on The Run may also contain runs by people who
                    don&apos;t have an account here, based on publicly available
                    data. We also keep runs from speedrun.com that no board
                    shows. If one of those runs is yours and you want it removed
                    or credited differently, contact us, whether a board shows
                    it or not. We then take the run out, and later fetches
                    don&apos;t bring it back. A run you did with others stays
                    for them, with you shown as an anonymous runner. If you only
                    want your name gone, your runs stay under an anonymous name.
                    Their video and their link to speedrun.com stay too, and
                    those can still show it is you, so you can ask for the whole
                    run to go instead. A run that someone with an account here
                    uploaded with their own timer is theirs and stays. To show a
                    run is yours, log in with the Twitch account on the
                    speedrun.com profile that holds it (the profile is then
                    linked to your account, and you confirm it in your import
                    settings), or email us with the video or the account that
                    posted the run.
                </li>
                <li>
                    Speedrun.com is not affiliated with The Run and has its own
                    rules.
                </li>
            </ul>

            <h2 id="data-licence">Data licence</h2>
            <p>
                Leaderboard data and race results on The Run are under our data
                licence, below. It has the same terms as speedrun.com&apos;s
                Leaderboard Data License. That is every run the boards show, how
                the boards are set up, rules text included, and every finished
                public race. Anyone can copy, share and change it for any
                purpose, commercially too, without asking. It covers data
                published before {SRC_SYNC_TERMS_DATE} too. That data was under{' '}
                <a
                    href="https://creativecommons.org/licenses/by-nc/4.0/"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    CC BY-NC 4.0
                    <span className="visually-hidden">
                        {' '}
                        (opens in a new tab)
                    </span>
                </a>{' '}
                and still is, since that licence can&apos;t be withdrawn, so you
                can use it under either.
            </p>
            <ul>
                <li>
                    You can copy, share, publish and change the data, in any
                    format, for any purpose, including commercial use.
                </li>
                <li>Don&apos;t use it to train AI models.</li>
                <li>
                    Don&apos;t say or suggest that The Run endorses you or what
                    you make. Saying the data comes from The Run is fine.
                </li>
                <li>
                    If you pass the data on, whoever you pass it to gets this
                    same licence.
                </li>
                <li>Credit is welcome but not required.</li>
                <li>
                    The licence doesn&apos;t expire. It stays in place if a
                    runner deletes a run or their account, if your account is
                    closed, or if these terms change. Only someone who breaks it
                    loses it.
                </li>
            </ul>
            <p>
                Runs and board setups marked as from speedrun.com don&apos;t get
                a licence from us. They come with the licence their runners
                gave: CC BY-NC 4.0, or speedrun.com&apos;s Leaderboard Data
                License for runners who accepted speedrun.com&apos;s terms of
                21&nbsp;October&nbsp;2026. Each one says so. We can&apos;t tell
                which applies to a run, so to be safe treat them as CC BY-NC
                4.0: non-commercial, with credit to the runner and speedrun.com.
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
                    Runs from speedrun.com that a board shows, fetched by us or
                    taken from the archive, and leaderboards whose setup was
                    copied from there. These are marked as from speedrun.com. A
                    run whose runner uploaded their own export, or whose
                    speedrun.com account is linked to an account here and
                    confirmed, is their content instead, with a note that it was
                    first posted on speedrun.com.
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
                    Videos themselves, run descriptions, profile pictures, race
                    descriptions and comments.
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
                    let others reuse it as described here, with your username.
                    Runs your timer uploads count too. So do leaderboard setups
                    you make or change as a moderator.
                </li>
                <li>
                    Adding someone else&apos;s run as a moderator doesn&apos;t
                    license anything for that runner. That run is covered as a
                    board entry only, like runs of people without an account.
                </li>
                <li>
                    Runs and race results from before {OPEN_DATA_LICENCE_DATE}{' '}
                    are covered too. They were already public on the site.
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
                    leaderboard pages give you one board at a time. Runs marked
                    as from speedrun.com are in them with their own licence
                    line. Runners who turned their name off are in them as
                    Anonymous.
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
                    Leaderboards with moderators are run by volunteers. They
                    decide which runs get verified, rejected or removed, and
                    what the rules for a game are. Moderators decide for their
                    community. They can also switch verification off for their
                    game. Then nothing on that board is reviewed, and the board
                    says so. A game without moderators starts with verification
                    off. If it is linked to speedrun.com, it starts as a copy of
                    the speedrun.com board, and runs newly verified there come
                    in within minutes. If it isn&apos;t, it shows no
                    speedrun.com runs, nobody reviews its runs, and runs from
                    The Run&apos;s timer show without review, unless the board
                    asks runners to submit them first. A board that copies
                    speedrun.com is moderated on speedrun.com, not here. We
                    don&apos;t verify runs. Apart from the archive import and
                    boards that add or copy speedrun.com runs, we don&apos;t add
                    runs to boards either. Runners and moderators do.
                    Speedrun.com runs only show on boards set to add or copy
                    them. We check reports when they reach us. We are
                    responsible for how the review procedure works, not for what
                    moderators add. Their decisions stand unless they are
                    changed on review.
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
                    A game&apos;s rules are up to its moderators. On a board
                    that copies speedrun.com they come from speedrun.com, and on
                    a game without moderators nobody changes them. A review only
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
