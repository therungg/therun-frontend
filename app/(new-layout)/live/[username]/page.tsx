import { Metadata } from 'next';
import { Live } from '~app/(new-layout)/live/live';
import { LiveRun } from '~app/(new-layout)/live/live.types';
import { liveRunArrayToMap } from '~app/(new-layout)/live/utilities';
import { getAllPatrons } from '~app/api/patreons/get-all-patrons.action';
import { getBaseUrl } from '~src/actions/base-url.action';
import { getSession } from '~src/actions/session.action';
import { getAllLiveRuns } from '~src/lib/live-runs';
import buildMetadata from '~src/utils/metadata';

interface PageProps {
    params: Promise<{ username: string }>;
    searchParams: Promise<{ commentary?: string }>;
}

export default async function LiveUser(props: PageProps) {
    const [params, searchParams, liveData, session, patrons] =
        await Promise.all([
            props.params,
            props.searchParams,
            getAllLiveRuns() as Promise<LiveRun[]>,
            getSession(),
            getAllPatrons(),
        ]);
    const liveDataMap = liveRunArrayToMap(liveData);

    const isPatron = Boolean(session.username && patrons[session.username]);
    const isAdmin = session.roles?.includes('admin');
    const canViewCommentary =
        isPatron || isAdmin || searchParams.commentary === 'true';

    return (
        <Live
            liveDataMap={liveDataMap}
            username={params.username}
            canViewCommentary={canViewCommentary}
        />
    );
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
    const params = await props.params;
    let imageUrl = undefined;
    const baseUrl = await getBaseUrl();
    const username = params.username;

    if (!username) return buildMetadata();

    let response: Response;
    try {
        response = await fetch(`${baseUrl}/api/users/${username}/global`);
    } catch (_e) {
        return buildMetadata();
    }

    const data = await response.json();

    if (data?.picture) {
        imageUrl = data.picture;
    }

    return buildMetadata({
        title: `Watch ${username} Live`,
        description: `${username} is live on The Run! Watch their run in real time and see data about their run, including current pace.`,
        images: imageUrl
            ? [
                  {
                      url: imageUrl,
                      secureUrl: imageUrl,
                      alt: `Profile photo of ${username}`,
                      type: 'image/png',
                      width: 300,
                      height: 300,
                  },
              ]
            : undefined,
        index: false,
    });
}
