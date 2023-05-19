import RunPage from "./[game]/[run]";
import { GetServerSideProps, GetServerSidePropsContext } from "next";
import { getRunByCustomUrl } from "../../lib/get-run";
import { getGameGlobal } from "../../components/game/get-game";
import { getLiveRunForUser } from "../../lib/live-runs";

export const getServerSideProps: GetServerSideProps = async (
    context: GetServerSidePropsContext
) => {
    const username: string = context.params.username as string;
    const customUrl: string = context.params.game as string;

    const run = await getRunByCustomUrl(username, customUrl);
    const game = run.game;
    const runName = run.run;

    const globalGameData = await getGameGlobal(run.game);

    if (!run) throw new Error("Could not find run");

    const liveData = await getLiveRunForUser(username);

    return {
        props: { run, username, game, runName, globalGameData, liveData },
    };
};

export default RunPage;
