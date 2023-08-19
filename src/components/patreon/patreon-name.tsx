import { useEffect, useState } from "react";
import patreonStyles from "./patreon-styles";
import { PatreonBunnySvgWithoutLink } from "~app/patron/patreon-info";
import { usePatreons } from "./use-patreons";
import { getColorMode } from "~src/utils/colormode";

export const NameAsPatreon = ({ name }) => {
    const { data: patreons, isLoading } = usePatreons();

    if (!isLoading && patreons && patreons[name]) {
        if (!patreons[name].preferences || !patreons[name].preferences.hide) {
            let color = 0;
            let showIcon = true;

            if (patreons[name].preferences) {
                color = patreons[name].preferences.colorPreference;
                showIcon = patreons[name].preferences.showIcon;
            }

            return (
                <PatreonName
                    name={name}
                    icon={showIcon}
                    color={color}
                    url={"/"}
                />
            );
        }
    }

    return <>{name}</>;
};

export const PatreonName = ({
    name,
    color = 0,
    icon = true,
    size = 20,
}: {
    name: string;
    color: number;
    icon?: boolean;
    size?: number;
}) => {
    const [dark, setDark] = useState(true);
    useEffect(function () {
        setDark(getColorMode() !== "light");
    }, []);

    const colors = patreonStyles();

    let style = colors.find((val) => val.id == color);

    if (!style) style = colors[0];

    style = dark ? style.style[0] : style.style[1];

    return (
        <>
            <span style={style}>{name}</span>{" "}
            {icon && <PatreonBunnySvgWithoutLink size={size} />}
        </>
    );
};

export default PatreonName;
