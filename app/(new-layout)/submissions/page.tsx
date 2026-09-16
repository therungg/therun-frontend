import { redirect } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { submissionsHref } from '~src/components/waiting-on-you/waiting-copy';
import buildMetadata from '~src/utils/metadata';
import settings from '../settings/settings.module.scss';

export const metadata = buildMetadata({
    title: 'Runs waiting on you',
    description: 'Runs a board is holding until you act on them.',
});

/** The list lives on the runner's profile now; this keeps old links working. */
export default async function SubmissionsPage() {
    const session = await getSession();
    if (session.username) redirect(submissionsHref(session.username));
    return (
        <div className={settings.pane}>
            <p className={settings.loginRequired}>
                Sign in to see the runs waiting on you.
            </p>
        </div>
    );
}
