import { Panel } from '~app/(new-layout)/components/panel.component';
import { getSession } from '~src/actions/session.action';
import { getLiveRunForUser } from '~src/lib/live-runs';
import { CurrentUserLivePanelView } from './current-user-live-panel-view';

export default async function CurrentUserLivePanel() {
    const session = await getSession();

    // No session = no panel
    if (!session?.username) {
        return null;
    }

    // Fetch live run data
    const liveData = await getLiveRunForUser(session.username);

    // No active run = no panel
    if (!liveData || (Array.isArray(liveData) && liveData.length === 0)) {
        return null;
    }

    return (
        <Panel
            subtitle="Currently Running"
            title="Your Live Run"
            link={{ url: `/live/${session.username}`, text: 'View Details' }}
            className="p-4"
        >
            <CurrentUserLivePanelView
                initialLiveData={liveData}
                username={session.username}
            />
        </Panel>
    );
}
