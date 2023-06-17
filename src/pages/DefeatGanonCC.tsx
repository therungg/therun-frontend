import GenericTournament, {
    getServerSidePropsGeneric,
} from "./tournaments/[tournament]";
import { GetServerSideProps, GetServerSidePropsContext } from "next";

export const getServerSideProps: GetServerSideProps = async (
    context: GetServerSidePropsContext
) => {
    context.params = {
        tournament: "Defeat Ganon No SRM Community Clash",
    };

    return getServerSidePropsGeneric(context);
};

export default GenericTournament;
