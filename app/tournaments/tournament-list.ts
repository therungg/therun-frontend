/* eslint-disable sonarjs/no-duplicate-string */
// Will just make this DB values in the future (I really will), no time now

type CombinedTournament = {
    guidingTournament: string;
    tournaments: string[];
};

type Tournament = {
    tournament: string;
};

type TournamentEntryValue = Tournament | CombinedTournament;

const tournamentEntries: Array<[string, TournamentEntryValue]> = [
    [
        "DefeatGanonCC",
        { tournament: "Defeat Ganon No SRM Community Clash Main Event" },
    ],
    ["dirtythirty", { tournament: "Dirty Thirty Sapphire Tourney 2" }],
    ["gsa", { tournament: "PACE Summer 2024" }],
    ["hgss", { tournament: "HGSS Blitz" }],
    ["lego", { tournament: "Lego Challenge 3" }],
    [
        "moist",
        {
            tournament: "MoistCr1tikal Tournament 5",
        },
    ],
    [
        "ludwig",
        {
            tournament: "MoistCr1tikal Tournament 5",
        },
    ],
    [
        "fast50",
        {
            tournament: "MoistCr1tikal Tournament 5",
        },
    ],
    ["saesr", { tournament: "NCW Seeding" }],
    ["WaifuRuns", { tournament: "WaifuRuns RE4 Tournament" }],
    [
        "SMOAnyPercentCC",
        { tournament: "Super Mario Odyssey Community Clash Qualifier" },
    ],
    ["ccg", { tournament: "CCG Community Clash: New Super Luigi U" }],
    [
        "hazebladeinvitational",
        { tournament: "Hazeblade Invitational Qualifiers ft. Resident Evil 4" },
    ],
    ["basementcup", { tournament: "Ultimate Basement Cup 2023" }],
    ["tcs", { tournament: "TCS Community BTR" }],
    ["nitro_cup", { tournament: "Nitro Cup SMO" }],
    ["nitro_tournament", { tournament: "Nitro Tournament VI" }],
    ["knuckles", { tournament: "Knuckles Story Eclipse the Record" }],
    [
        "3dmm",
        {
            guidingTournament: "3D Mario Madness Season 3",
            tournaments: [
                "3DMM SM64 70 Star",
                "3DMM SMS Any%",
                "3DMM SMG Any%",
                "3DMM SMG2 Any%",
                "3DMM SM3DW Any%",
                "3DMM SMO Any%",
            ],
        },
    ],
    ["rayman", { tournament: "Rayman 1 BTR" }],
];

const tournamentMap: Map<string, Tournament | CombinedTournament> = new Map(
    tournamentEntries,
);

export const getAllTournamentSlugs = (): string[] => {
    return Array.from(tournamentMap.keys());
};

export const getTournamentNameFromSlug = (
    slug: string,
): Tournament | CombinedTournament | undefined => {
    return tournamentMap.get(slug);
};
