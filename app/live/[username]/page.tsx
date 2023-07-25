import { getAllLiveRuns } from "~src/lib/live-runs";
import { LiveRun } from "~app/live/live.types";
import { liveRunArrayToMap } from "~app/live/utilities";
import { Live } from "~app/live/live";
import { Metadata } from "next";
import { getBaseUrl } from "~src/actions/base-url.action";
import buildMetadata from "~src/utils/metadata";

export const revalidate = 0;

interface PageProps {
    params: { username: string };
}

export default async function LiveUser({ params }: PageProps) {
    const liveData: LiveRun[] = await getAllLiveRuns();
    const liveDataMap = liveRunArrayToMap(liveData);

    return <Live liveDataMap={liveDataMap} username={params.username} />;
}

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    let imageUrl = undefined;
    const baseUrl = getBaseUrl();
    const username = params.username;

    if (!username) return buildMetadata();

    let response: Response;
    try {
        response = await fetch(`${baseUrl}/api/users/${username}/global`);
    } catch (e) {
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
                      type: "image/png",
                      width: 300,
                      height: 300,
                  },
              ]
            : undefined,
        index: false,
    });
}
