import GenericTournament, {
    getServerSidePropsGeneric,
} from "./tournaments/[tournament]";
import { GetServerSideProps, GetServerSidePropsContext } from "next";

export const getServerSideProps: GetServerSideProps = async (
    context: GetServerSidePropsContext
) => {
    context.params = {
        tournament: "Lego Challenge 3",
    };

    return getServerSidePropsGeneric(context);
};

export default GenericTournament;
