import GenericTournament, {
    getServerSidePropsGeneric,
} from "./tournaments/[tournament]";
import { GetServerSideProps, GetServerSidePropsContext } from "next";

export const getServerSideProps: GetServerSideProps = async (
    context: GetServerSidePropsContext
) => {
    context.params = {
        tournament: "Dirty Thirty Sapphire Tourney 2",
    };

    return getServerSidePropsGeneric(context);
};

export default GenericTournament;
