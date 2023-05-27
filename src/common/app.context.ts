import React from "react";

interface AppContextProps {
    baseUrl: string;
}

export const AppContext = React.createContext<AppContextProps>({
    baseUrl: "",
});
