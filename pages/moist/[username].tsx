import Moist from "../moist";
import { GetServerSideProps, GetServerSidePropsContext } from "next";
import { LiveRun } from "../../components/live/live-user-run";
import { getLiveRunsForGameCategory } from "../../lib/live-runs";
import { getTournamentByName } from "../../components/tournament/getTournaments";
import { liveRunArrayToMap } from "../live";

export const getServerSideProps: GetServerSideProps = async (
    context: GetServerSidePropsContext
) => {
    const tournament = await getTournamentByName("MoistCr1tikal tournament");

    tournament.game = tournament.eligibleRuns[0].game;
    tournament.category = tournament.eligibleRuns[0].category;

    const liveData: LiveRun[] = await getLiveRunsForGameCategory(
        tournament.game,
        tournament.category
    );

    return {
        props: {
            liveDataMap: liveRunArrayToMap(liveData),
            tournament,
            username: context.params.username,
        },
    };
};

export default Moist;
