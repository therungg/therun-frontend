import GenericTournament, {
    getServerSidePropsGeneric,
} from "./tournaments/[tournament]";
import { GetServerSideProps, GetServerSidePropsContext } from "next";

export const getServerSideProps: GetServerSideProps = async (
    context: GetServerSidePropsContext
) => {
    context.params = {
        tournament: "WaifuRuns RE4 Tournament",
    };

    return getServerSidePropsGeneric(context);
};

export default GenericTournament;
