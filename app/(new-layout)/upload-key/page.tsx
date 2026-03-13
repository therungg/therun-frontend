import Livesplit from '~app/(new-layout)/livesplit/page';
import buildMetadata from '~src/utils/metadata';

export default async function UploadKey() {
    return <Livesplit />;
}

export const metadata = buildMetadata({
    title: 'Your LiveSplit Key',
    description:
        "Get your upload key to use in The Run's LiveSplit component from here.",
    index: false,
    follow: false,
});
