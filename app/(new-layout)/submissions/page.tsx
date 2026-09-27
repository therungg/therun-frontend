import { redirect } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { runnerProfileHref } from '~src/lib/runner-profile-href';
import buildMetadata from '~src/utils/metadata';
import settings from '../settings/settings.module.scss';

export const metadata = buildMetadata({
    title: 'Runs waiting on you',
    description: 'Personal bests a board is holding until you submit them.',
});

/**
 * Your runs, their status and what they need from you now live on your
 * Leaderboards tab. This address stays for links in older notifications.
 */
export default async function SubmissionsPage() {
    const session = await getSession();
    if (session.id && session.username) {
        redirect(runnerProfileHref(session.username));
    }
    return (
        <div className={settings.pane}>
            <p className={settings.loginRequired}>
                Sign in to see the runs waiting on you.
            </p>
        </div>
    );
}
