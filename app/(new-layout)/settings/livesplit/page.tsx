import { getSession } from '~src/actions/session.action';
import { getUploadKey } from '~src/lib/get-upload-key';
import buildMetadata from '~src/utils/metadata';
import { LivesplitSetup } from './livesplit-setup';

export default async function Livesplit() {
    const session = await getSession();
    if (!session.id || !session.username) return null;
    const uploadKey = await getUploadKey(session.username, session.id);

    return <LivesplitSetup uploadKey={uploadKey} />;
}

export const metadata = buildMetadata({
    title: 'LiveSplit key',
    description:
        "Get your LiveSplit key to use in The Run's LiveSplit component from here.",
    index: false,
    follow: false,
});
