const importantRaceMap = new Map([
    ["test", "test1234"],
    ["first-race-ever", "odny"],
]);

export const getImportantRace = (slug: string): string | undefined => {
    return importantRaceMap.get(slug);
};
