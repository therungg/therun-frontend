interface PatreonColorData {
    colorset1: string | string[];
    colorset2: string | string[];
    tier: number;
    id: number;
}

export const patreonStyles = () => {
    const colors: PatreonColorData[] = [
        {
            colorset1: "#27A11B",
            colorset2: "#007c00",
            tier: 1,
            id: 0,
        },
        {
            colorset1: "#fdc544",
            colorset2: "#a3850e",
            tier: 2,
            id: 100,
        },
        {
            colorset1: "white",
            colorset2: "black",
            tier: 2,
            id: 101,
        },
        {
            colorset1: "HOTPINK",
            colorset2: "purple",
            tier: 2,
            id: 102,
        },
        {
            colorset1: "lightgrey",
            colorset2: "grey",
            tier: 2,
            id: 103,
        },
        {
            colorset1: "red",
            colorset2: "darkred",
            tier: 2,
            id: 104,
        },
        {
            colorset1: "lightblue",
            colorset2: "blue",
            tier: 2,
            id: 105,
        },
        {
            colorset1: "#9400D3",
            colorset2: "purple",
            tier: 2,
            id: 106,
        },
        {
            colorset1: "#946DE3",
            colorset2: "#946DE3",
            tier: 2,
            id: 107,
        },
        {
            colorset1: ["red", "lightblue"],
            colorset2: ["red", "blue"],
            tier: 3,
            id: 200,
        },
        {
            colorset1: ["#fdc544", "white"],
            colorset2: ["#a3850e", "black"],
            tier: 3,
            id: 201,
        },
        {
            colorset1: ["#007c00", "hotpink"],
            colorset2: ["#27A11B", "purple"],
            tier: 3,
            id: 202,
        },
        {
            colorset1: ["hotpink", "lightgrey"],
            colorset2: ["purple", "grey"],
            tier: 3,
            id: 203,
        },
        {
            colorset1: ["lightblue", "white"],
            colorset2: ["blue", "black"],
            tier: 3,
            id: 204,
        },
        {
            colorset1: ["#E40303", "#FFED00"],
            colorset2: ["#E40303", "#FFED00"],
            tier: 3,
            id: 205,
        },
        {
            colorset1: [
                "#E40303",
                "#FF8C00",
                "#FFED00",
                "#008026",
                "#24408E",
                "#732982",
            ],
            colorset2: [
                "#E40303",
                "#FF8C00",
                "#FFED00",
                "#008026",
                "#24408E",
                "#732982",
            ],
            tier: 3,
            id: 207,
        },
        {
            colorset1: ["#5BCEFA", "#F5A9B8", "#FFFFFF", "#F5A9B8", "#5BCEFA"],
            colorset2: ["#5BCEFA", "#F5A9B8", "#FFFFFF", "#F5A9B8", "#5BCEFA"],
            tier: 3,
            id: 208,
        },
        {
            colorset1: ["#FCA11E", "#FF726E", "#FF726E"],
            colorset2: ["#FCA11E", "#FF726E", "#FF726E"],
            tier: 3,
            id: 209,
        },
        {
            colorset1: ["#1ede3e", "#18adf2"],
            colorset2: ["#1ede3e", "#18adf2"],
            tier: 3,
            id: 210,
        },
        {
            colorset1: ["#DBB4FF", "#B1F4CF"],
            colorset2: ["#DBB4FF", "#B1F4CF"],
            tier: 3,
            id: 211,
        },
        {
            colorset1: ["#00B0F0", "#93E3FF", "#93E3FF", "#00B0F0"],
            colorset2: ["#00B0F0", "#93E3FF", "#93E3FF", "#00B0F0"],
            tier: 3,
            id: 212,
        },
    ];

    return colors.map((patreonColorData) => {
        if (
            Array.isArray(patreonColorData.colorset1) &&
            Array.isArray(patreonColorData.colorset2)
        ) {
            const darkModeString = patreonColorData.colorset1.join(",");
            const lightModeString = patreonColorData.colorset2.join(",");
            return {
                tier: patreonColorData.tier,
                id: patreonColorData.id,
                style: [
                    {
                        backgroundImage: `-webkit-linear-gradient(left, ${darkModeString})`,
                        WebkitBackgroundClip: "text",
                        backgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        color: "transparent",
                    },
                    {
                        backgroundImage: `-webkit-linear-gradient(left, ${lightModeString})`,
                        WebkitBackgroundClip: "text",
                        backgroundClip: "text",
                        color: "transparent",
                        WebkitTextFillColor: "transparent",
                    },
                ],
            };
        }
        return {
            tier: patreonColorData.tier,
            id: patreonColorData.id,
            style: [
                {
                    color: patreonColorData.colorset1 as string,
                    backgroundImage: `-webkit-linear-gradient(left, ${
                        patreonColorData.colorset1 as string
                    })`,
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                },
                {
                    color: patreonColorData.colorset2 as string,
                    backgroundImage: `-webkit-linear-gradient(left, ${
                        patreonColorData.colorset2 as string
                    })`,
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                },
            ],
        };
    });
};

export default patreonStyles;
