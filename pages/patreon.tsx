import React from "react";
import Patron from "./patron";

export const Patreon = ({ session, userPatreonData, patreonData }) => {
    return (
        <Patron
            session={session}
            userPatreonData={userPatreonData}
            patreonData={patreonData}
        />
    );
};

export default Patreon;
