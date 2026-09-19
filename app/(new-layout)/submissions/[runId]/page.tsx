import { notFound } from 'next/navigation';
import { loadPbSubmissionAction } from '~src/actions/pb-submission.action';
import { getSession } from '~src/actions/session.action';
import Link from '~src/components/link';
import { buildRunHref } from '~src/lib/board-url';
import { getRunById } from '~src/lib/leaderboards-v1';
import buildMetadata from '~src/utils/metadata';
import settings from '../../settings/settings.module.scss';
import { SubmissionForm } from './submission-form';

export const metadata = buildMetadata({
    title: 'Submit your run',
    description: 'Confirm a personal best a board is holding for you.',
});

export default async function SubmissionPage(props: {
    params: Promise<{ runId: string }>;
}) {
    const { runId } = await props.params;
    const id = Number.parseInt(runId, 10);
    if (!Number.isFinite(id)) notFound();

    const session = await getSession();
    if (!session.id) {
        return (
            <div className={settings.pane}>
                <p className={settings.loginRequired}>
                    Sign in to submit your run.
                </p>
            </div>
        );
    }

    const res = await loadPbSubmissionAction(id);
    // Not yours, already submitted, or never held: all the same from here.
    if (!res.ok) notFound();
    const run = await getRunById(id).catch(() => null);

    return (
        <div className={settings.pane}>
            <header className={settings.paneHeader}>
                <h1 className={settings.paneTitle}>Submit your run</h1>
                <p className={settings.paneLede}>
                    This board asks its runners to confirm their own personal
                    bests. What you send goes to a moderator. You are not
                    verifying the run yourself.
                </p>
                {run ? (
                    <p className={settings.paneLede}>
                        <Link href={buildRunHref(run.gameDisplay, id)}>
                            {run.gameDisplay} · {run.categoryDisplay}
                        </Link>
                    </p>
                ) : null}
            </header>
            <SubmissionForm form={res.form} />
        </div>
    );
}
