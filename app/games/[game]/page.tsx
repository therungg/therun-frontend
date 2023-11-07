import { Metadata } from "next";
import { getBaseUrl } from "~src/actions/base-url.action";
import { safeDecodeURI, safeEncodeURI } from "~src/utils/uri";
import { Game } from "./game";
import buildMetadata, { getGameImage } from "~src/utils/metadata";

interface PageProps {
    params: { game: string };
}

export default async function GamePage({ params }: PageProps) {
    const { game: gameName } = params;
    const baseUrl = getBaseUrl();

    if (!gameName) {
        throw new Error("Params not found");
    }
    const response = await fetch(
        `${baseUrl}/api/games/${safeEncodeURI(gameName)}`
    );
    const data = await response.json();

    if (!data?.global || !data?.data?.game) {
        return (
            <>
                <h1>Game</h1>
                Unfortunately, Nobody has uploaded runs for this game yet, or
                the upload is not processed yet. If you have uploaded runs for
                the game, but this page still shows, please{" "}
                <a href={"/contact"}>contact me!</a>
                {JSON.stringify(data)}
            </>
        );
    }

    if (!data.stats) {
        return (
            <div>
                This game has no categories... Something weird happened. If you
                found this game through the search function, It is likely that
                this game had only one runner and they deleted their runs.
                Sorry!
            </div>
        );
    }
    return <Game data={data} />;
}

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    if (!params.game) return buildMetadata();

    const game = safeDecodeURI(params.game);

    return buildMetadata({
        title: `Statistics for ${game}`,
        description: `View statistics for ${game}, including categories, top runners, total run time, and more!`,
        images: await getGameImage(game),
    });
}
