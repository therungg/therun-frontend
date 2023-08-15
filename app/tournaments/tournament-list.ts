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
    ["gsa", { tournament: "SWRC Season 3: Super Mario 64" }],
    ["hgss", { tournament: "HGSS Blitz" }],
    ["lego", { tournament: "Lego Challenge 3" }],
    [
        "moist",
        {
            tournament:
                "The Elder Scrolls Adventures: Redguard Speedrun Challenge",
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
    [
        "3dmmi",
        {
            guidingTournament: "3D Mario Madness Season 3",
            tournaments: [
                "3DMMI SM64 70 Star",
                "3DMMI SMS Any%",
                "3DMMI SMG Any%",
                "3DMMI SMG2 Any%",
                "3DMMI SM3DW Any%",
                "3DMMI SMO Any%",
            ],
        },
    ],
];

const tournamentMap: Map<string, Tournament | CombinedTournament> = new Map(
    tournamentEntries
);

export const getAllTournamentSlugs = (): string[] => {
    return Array.from(tournamentMap.keys());
};

export const getTournamentNameFromSlug = (
    slug: string
): Tournament | CombinedTournament | undefined => {
    return tournamentMap.get(slug);
};
