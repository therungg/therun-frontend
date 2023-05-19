export const patreonStyles = () => {
    const colors = [
        ["#27A11B", "#007c00", 1, 0],
        ["#fdc544", "#a3850e", 2, 100],
        ["white", "black", 2, 101],
        ["HOTPINK", "purple", 2, 102],
        ["lightgrey", "grey", 2, 103],
        ["red", "darkred", 2, 104],
        ["lightblue", "blue", 2, 105],
        ["#9400D3", "purple", 2, 106],
        ["#946DE3", "#946DE3", 2, 107],
        [["red", "lightblue"], ["red", "blue"], 3, 200],
        [["#fdc544", "white"], ["#a3850e", "black"], 3, 201],
        [["#007c00", "hotpink"], ["#27A11B", "purple"], 3, 202],
        [["hotpink", "lightgrey"], ["purple", "grey"], 3, 203],
        [["lightblue", "white"], ["blue", "black"], 3, 204],
        [["#E40303", "#FFED00"], ["#E40303", "#FFED00"], 3, 205],
        [
            ["#E40303", "#FF8C00", "#FFED00", "#008026", "#24408E", "#732982"],
            ["#E40303", "#FF8C00", "#FFED00", "#008026", "#24408E", "#732982"],
            3,
            207,
        ],
        [
            ["#5BCEFA", "#F5A9B8", "#FFFFFF", "#F5A9B8", "#5BCEFA"],
            ["#5BCEFA", "#F5A9B8", "#FFFFFF", "#F5A9B8", "#5BCEFA"],
            3,
            208,
        ],
        [
            ["#FCA11E", "#FF726E", "#FF726E"],
            ["#FCA11E", "#FF726E", "#FF726E"],
            3,
            209,
        ],
        [["#1ede3e", "#18adf2"], ["#1ede3e", "#18adf2"], 3, 210],
        [["#DBB4FF", "#B1F4CF"], ["#DBB4FF", "#B1F4CF"], 3, 211],
        [
            ["#00B0F0", "#93E3FF", "#93E3FF", "#00B0F0"],
            ["#00B0F0", "#93E3FF", "#93E3FF", "#00B0F0"],
            3,
            212,
        ],
    ];

    return colors.map((colorArray) => {
        if (Array.isArray(colorArray[0])) {
            const darkModeString = colorArray[0].join(",");
            const lightModeString = colorArray[1].join(",");
            return {
                value: colorArray,
                tier: colorArray[2],
                id: colorArray[3],
                style: [
                    {
                        backgroundImage: `-webkit-linear-gradient(left, ${darkModeString})`,
                        WebkitBackgroundClip: "text",
                        backgroundClip: "text",
                        color: "transparent",
                        WebkitTextFillColor: "transparent",
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
            value: colorArray,
            tier: colorArray[2],
            id: colorArray[3],
            style: [{ color: colorArray[0] }, { color: colorArray[1] }],
        };
    });
};

export default patreonStyles;
