import GenericTournament, {
    getServerSidePropsGeneric,
} from "./tournaments/[tournament]";
import { GetServerSideProps, GetServerSidePropsContext } from "next";

export const getServerSideProps: GetServerSideProps = async (
    context: GetServerSidePropsContext
) => {
    context.params = {
        tournament: "The Elder Scrolls Adventures: Redguard Speedrun Challenge",
    };

    return getServerSidePropsGeneric(context);
};

export default GenericTournament;
