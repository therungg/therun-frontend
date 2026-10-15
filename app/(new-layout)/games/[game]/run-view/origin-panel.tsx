import { SRC_ARCHIVE_URL } from '~app/(new-layout)/components/open-data-licence';
import Link from '~src/components/link';
import { getTwitchOAuthURL } from '~src/components/twitch/twitch-oauth';
import { formatBoardDate } from '~src/lib/format-run-date';
import { originSummary } from '~src/lib/run-view/origin-summary';
import { srcRunUrl } from '~src/lib/src-links';
import styles from './run-page.module.scss';
import type { RunViewModel } from './run-view';

export function OriginPanel({ model }: { model: RunViewModel }) {
    const summary = originSummary(model.origin, model.runnerName);
    if (!summary) return null;

    const ingestedAt = model.origin?.ingestedAt ?? null;
    const srcRunId = model.origin?.srcRunId ?? null;
    const provenance = model.origin?.srcProvenance;
    const fromSrc =
        model.isGuest && (provenance === 'archive' || provenance === 'fetched');

    return (
        <span className={styles.origin}>
            <span>
                {summary.line}
                {summary.ccLicence && (
                    <>
                        ,{' '}
                        <a
                            href="https://creativecommons.org/licenses/by-nc/4.0/"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            CC BY-NC 4.0
                        </a>
                    </>
                )}
            </span>
            {ingestedAt && <span>Added {formatBoardDate(ingestedAt)}</span>}
            {srcRunId && (
                <a href={srcRunUrl(srcRunId)} target="_blank" rel="noreferrer">
                    View on speedrun.com
                </a>
            )}
            {fromSrc && (
                <span>
                    {provenance === 'archive' ? (
                        <>
                            This run comes from a{' '}
                            <a
                                href={SRC_ARCHIVE_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                public archive of speedrun.com data
                            </a>{' '}
                            (CC BY-NC 4.0).
                        </>
                    ) : (
                        'This run was fetched from speedrun.com before 1 October 2026 (CC BY-NC 4.0).'
                    )}{' '}
                    Is this you? <a href={getTwitchOAuthURL({}).href}>Log in</a>{' '}
                    with the Twitch account on your speedrun.com profile, or{' '}
                    <Link href="/settings/import">
                        upload your speedrun.com export
                    </Link>
                    , and it becomes yours. You can also{' '}
                    <a href={`mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL}`}>
                        email us
                    </a>{' '}
                    to have it removed or credited differently. How we handle
                    this is in the{' '}
                    <Link href="/privacy-policy#why">privacy policy</Link>.
                </span>
            )}
        </span>
    );
}
