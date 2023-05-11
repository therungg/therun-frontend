import GenericTournament, {
    getServerSidePropsGeneric,
} from "./tournaments/[tournament]";
import { GetServerSideProps, GetServerSidePropsContext } from "next";

export const getServerSideProps: GetServerSideProps = async (
    context: GetServerSidePropsContext
) => {
    context.params = {
        tournament: "SWRC Season 2: Metroid Dread",
    };

    return getServerSidePropsGeneric(context);
};

export default GenericTournament;
