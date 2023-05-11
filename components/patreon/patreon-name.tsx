import { useEffect, useState } from "react";
import patreonStyles from "./patreon-styles";
import { PatreonBunnySvgWithoutLink } from "../../pages/patron";
import { usePatreons } from "./use-patreons";

export const NameAsPatreon = ({ name }) => {
    const patreons = usePatreons();

    if (patreons && patreons[name]) {
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
        setDark(document.body.dataset.theme !== "light");
    }, []);

    const colors = patreonStyles();

    let style = colors.find((val) => val.id == color);

    if (!style) style = colors[0];

    style = dark ? style.style[0] : style.style[1];

    return (
        <span>
            <span style={style}>{name}</span>{" "}
            {icon && <PatreonBunnySvgWithoutLink size={size} />}
        </span>
    );
};

export default PatreonName;
