import Link from '~src/components/link';
import buildMetadata from '~src/utils/metadata';
import styles from '../styles/shared/content-page.module.scss';

export const metadata = buildMetadata({
    title: 'Terms of Service',
    description: 'The rules for using The Run.',
});

export default function Terms() {
    return (
        <div className={styles.content}>
            <h1>Terms of Service</h1>
            <p>Last updated: 2 September 2026</p>
            <p>
                The Run is a free site for speedrun statistics and leaderboards,
                run from the Netherlands. These are the rules for using it. They
                are short on purpose. If you keep using the site, you agree to
                them. If you don&apos;t agree, don&apos;t use the site.
            </p>
            <p>
                How we handle your data is in the{' '}
                <Link href="/privacy-policy">privacy policy</Link>. That
                document is part of these terms.
            </p>

            <h2>Your account</h2>
            <ul>
                <li>
                    You log in with Twitch. We read your Twitch username and
                    email address when you do. We don&apos;t get your Twitch
                    password.
                </li>
                <li>
                    You need to be at least 16 years old to have an account. If
                    you are younger, ask a parent or guardian to agree to these
                    terms for you.
                </li>
                <li>
                    You are responsible for what happens on your account. Keep
                    your Twitch login safe.
                </li>
                <li>
                    You can link a Patreon account to unlock supporter perks.
                    Payment goes through Patreon, not through us. Perks are tied
                    to your tier and can change over time. We don&apos;t handle
                    refunds; Patreon does.
                </li>
            </ul>

            <h2>What you upload and submit</h2>
            <p>
                Almost everything on The Run is data you and other runners put
                there: splits files, run submissions, videos, profile details,
                leaderboard settings, comments and so on. We call all of this
                &quot;your content&quot;.
            </p>
            <ul>
                <li>Your content stays yours.</li>
                <li>
                    By uploading or submitting it you give us permission to
                    store it, process it, show it on the site, and use it in
                    statistics and leaderboards. This includes public pages that
                    anyone can see and that search engines can index.
                </li>
                <li>
                    Only submit runs that you actually did yourself. Don&apos;t
                    submit runs on behalf of someone else unless they asked you
                    to.
                </li>
                <li>
                    Don&apos;t upload anything you don&apos;t have the right to
                    share, and nothing illegal, hateful or harassing.
                </li>
                <li>
                    If you delete your account, your private data is removed.
                    Verified runs on public leaderboards stay, but with your
                    name taken off, so the leaderboard history stays intact for
                    everyone else. Ask us if you want a specific run removed
                    outright.
                </li>
            </ul>

            <h2>Importing runs from speedrun.com</h2>
            <p>
                You can ask us to import your runs from speedrun.com. When you
                do this, you allow us to fetch your public run data from
                speedrun.com and show it on The Run, in the same way as a run
                you submitted here directly.
            </p>
            <ul>
                <li>Only import runs that are yours.</li>
                <li>
                    Imported runs are your content under these terms. You can
                    remove them from your profile at any time.
                </li>
                <li>
                    Leaderboards on The Run may also contain runs by people who
                    don&apos;t have an account here, based on publicly available
                    results. If one of those runs is yours and you want it
                    removed or attributed differently, contact us.
                </li>
                <li>
                    Leaderboard data on speedrun.com is published under the
                    Creative Commons BY-NC 4.0 licence. Imported runs are shown
                    with a link back to speedrun.com as the source, as that
                    licence asks. We don&apos;t sell imported data or put it
                    behind a paywall.
                </li>
                <li>
                    Speedrun.com is not affiliated with The Run. Their site has
                    its own rules.
                </li>
            </ul>

            <h2>Leaderboards and moderation</h2>
            <ul>
                <li>
                    Leaderboards are run by volunteer moderators. They decide
                    which runs get verified, rejected or removed, and what the
                    rules for a game are. Those decisions are made on our behalf
                    and are final unless we say otherwise.
                </li>
                <li>
                    Cheating, faking runs, splicing videos, or lying to
                    moderators gets your runs removed and can get you banned.
                </li>
                <li>
                    We can remove content, suspend or delete accounts, and
                    refuse service if you break these terms. If we ban you,
                    don&apos;t make a new account.
                </li>
                <li>
                    Don&apos;t scrape the site, hammer the API, or try to get
                    around rate limits or access controls. If you want data in
                    bulk, ask.
                </li>
            </ul>

            <h2>The site itself</h2>
            <ul>
                <li>
                    The Run is offered as-is. It is a hobby project. We try to
                    keep it up and accurate, but stats can be wrong, the site
                    can go down, and features can change or disappear without
                    notice.
                </li>
                <li>
                    Game names, box art and other game data come from third
                    parties and belong to their respective owners.
                </li>
                <li>
                    The site&apos;s own code, design and name belong to us.
                    Don&apos;t copy the site or pretend to be it.
                </li>
                <li>
                    We link to other sites (Twitch, YouTube, and so on). What
                    happens there is between you and them.
                </li>
                <li>
                    To the extent the law allows, we are not liable for any
                    damage that comes from using the site or from not being able
                    to use it. If we are liable anyway, it is capped at the
                    amount you paid us in the past twelve months, which for most
                    people is nothing.
                </li>
            </ul>

            <h2>Changes and disputes</h2>
            <ul>
                <li>
                    We may change these terms. If it is a meaningful change we
                    will say so on the site. The date at the top tells you when
                    they last changed.
                </li>
                <li>
                    Dutch law applies. Disputes go to the courts in the
                    Netherlands, unless the law where you live says otherwise.
                </li>
                <li>
                    Questions? Email{' '}
                    <a href={`mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL}`}>
                        {process.env.NEXT_PUBLIC_CONTACT_EMAIL}
                    </a>
                    .
                </li>
            </ul>
        </div>
    );
}
