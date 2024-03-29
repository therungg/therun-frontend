const importantRaceMap = new Map([
    ["test", "test1234"],
    ["first-race-ever", "odny"],
    ["pace-race", "pace-2024"],
    ["ricky-weekly", "ricky-weekly-2"],
]);

export const getImportantRace = (slug: string): string | undefined => {
    return importantRaceMap.get(slug);
};
