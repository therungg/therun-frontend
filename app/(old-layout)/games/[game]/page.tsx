import { Metadata } from "next";
import { safeDecodeURI } from "~src/utils/uri";
import { Game } from "./game";
import buildMetadata, { getGameImage } from "~src/utils/metadata";
import { getGame } from "~src/components/game/get-game";
import Link from "next/link";

export const revalidate = 60;
// Increase Games Page timeout to 60 seconds since the payloads are gigantic for some games like SM64
export const maxDuration = 60;

interface PageProps {
    params: Promise<{ game: string }>;
}

export default async function GamePage(props: PageProps) {
    const params = await props.params;
    const { game: gameName } = params;

    if (!gameName) {
        throw new Error("Params not found");
    }
    const data = await getGame(gameName);

    if (!data?.global || !data?.data?.game) {
        return (
            <>
                <h1>Game</h1>
                Unfortunately, Nobody has uploaded runs for this game yet, or
                the upload is not processed yet. If you have uploaded runs for
                the game, but this page still shows, please{" "}
                <Link href="/contact">contact me!</Link>
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

export async function generateMetadata(props: PageProps): Promise<Metadata> {
    const params = await props.params;
    if (!params.game) return buildMetadata();

    const game = safeDecodeURI(params.game);

    return buildMetadata({
        title: `Statistics for ${game}`,
        description: `View statistics for ${game}, including categories, top runners, total run time, and more!`,
        images: await getGameImage(game),
    });
}
