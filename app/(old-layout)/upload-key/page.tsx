import buildMetadata from "~src/utils/metadata";
import Livesplit from "~app/(old-layout)/livesplit/page";

export const revalidate = 0;

export default async function UploadKey() {
    return <Livesplit />;
}

export const metadata = buildMetadata({
    title: "Your LiveSplit Key",
    description:
        "Get your upload key to use in The Run's LiveSplit component from here.",
    index: false,
    follow: false,
});
