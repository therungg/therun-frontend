// Will just make this DB values in the future (I really will), no time now

const tournamentMap: Map<string, string> = new Map([
    ["DefeatGanonCC", "Defeat Ganon No SRM Community Clash Main Event"],
    ["dirtythirty", "Dirty Thirty Sapphire Tourney 2"],
    ["gsa", "SWRC Season 3: Super Mario 64"],
    ["hgss", "HGSS Blitz"],
    ["lego", "Lego Challenge 3"],
    ["moist", "The Elder Scrolls Adventures: Redguard Speedrun Challenge"],
    ["saesr", "NCW Seeding"],
    ["WaifuRuns", "WaifuRuns RE4 Tournament"],
    ["SMOAnyPercentCC", "Super Mario Odyssey Community Clash Qualifier"],
    ["ccg", "Super Mario Odyssey Community Clash"],
    [
        "hazebladeinvitational",
        "Hazeblade Invitational Qualifiers ft. Resident Evil 4",
    ],
    ["basementcup", "Ultimate Basement Cup 2023"],
]);

export const getAllTournamentSlugs = (): string[] => {
    return Array.from(tournamentMap.keys());
};

export const getTournamentNameFromSlug = (slug: string): string | undefined => {
    return tournamentMap.get(slug);
};
