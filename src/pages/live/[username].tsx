import Live, { liveRunArrayToMap } from "../live";
import { GetServerSideProps, GetServerSidePropsContext } from "next";
import { LiveRun } from "../../components/live/live-user-run";
import { getAllLiveRuns } from "../../lib/live-runs";

export const getServerSideProps: GetServerSideProps = async (
    context: GetServerSidePropsContext
) => {
    const liveData: LiveRun[] = await getAllLiveRuns();
    return {
        props: {
            liveDataMap: liveRunArrayToMap(liveData),
            username: context.params.username,
        },
    };
};

export default Live;
