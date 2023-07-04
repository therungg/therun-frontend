// Will just make this DB values in the future (I really will), no time now

const tournamentMap: Map<string, string> = new Map([
    ["DefeatGanonCC", "Defeat Ganon No SRM Community Clash Main Event"],
    ["dirtythirty", "Dirty Thirty Sapphire Tourney 2"],
    ["gsa", "PACE Summer 2023"],
    ["hgss", "HGSS Blitz"],
    ["lego", "Lego Challenge 3"],
    ["moist", "The Elder Scrolls Adventures: Redguard Speedrun Challenge"],
    ["saesr", "NCW Seeding"],
    ["WaifuRuns", "WaifuRuns RE4 Tournament"],
    ["SMOAnyPercentCC", "Super Mario Odyssey Any% Community Clash"],
]);

export const getAllTournamentSlugs = (): string[] => {
    return Array.from(tournamentMap.keys());
};

export const getTournamentNameFromSlug = (slug: string): string | undefined => {
    return tournamentMap.get(slug);
};
