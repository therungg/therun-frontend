// Will just make this DB values in the future (I really will), no time now

const tournamentMap: Map<string, string> = new Map([
    ["DefeatGanonCC", "Defeat Ganon No SRM Community Clash Main Event"],
    ["dirtythirty", "Dirty Thirty Sapphire Tourney 2"],
    ["gsa", "GSA PACE Qualifiers 3"],
    ["hgss", "HGSS Blitz"],
    ["lego", "Lego Challenge 3"],
    ["moist", "The Elder Scrolls Adventures: Redguard Speedrun Challenge"],
    ["saesr", "NCW Seeding"],
    ["WaifuRuns", "WaifuRuns RE4 Tournament"],
]);

export const getTournamentNameFromSlug = (slug: string): string | undefined => {
    return tournamentMap.get(slug);
};
