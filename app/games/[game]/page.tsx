import { Metadata } from "next";
import { getBaseUrl } from "~src/actions/base-url.action";
import { encodeURI } from "~src/utils/uri";
import { Game } from "./game";

interface PageProps {
    params: { game: string };
}

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    return {
        title: params.game,
        description: `The Run game overview for ${params.game}`,
    };
}

export default async function GamePage({ params }: PageProps) {
    const { game: gameName } = params;
    const baseUrl = getBaseUrl();

    if (!gameName) {
        throw new Error("Params not found");
    }
    const response = await fetch(`${baseUrl}/api/games/${encodeURI(gameName)}`);
    const data = await response.json();

    if (!data?.global || !data?.data?.game) {
        return (
            <>
                <h1>Game</h1>
                Unfortunately, Nobody has uploaded runs for this game yet, or
                the upload is not processed yet. If you have uploaded runs for
                the game, but this page still shows, please{" "}
                <a href={"/contact"}>contact me!</a>
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
