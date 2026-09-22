export interface ExistingGame {
    name: string;
    display: string;
}

export interface AddGameSearchResult {
    id: number;
    name: string;
    year: number | null;
    cover: { url: string } | null;
    existing: ExistingGame | null;
}

export type AddGameResult =
    | { created: true; game: { id: number; name: string; display: string } }
    | { created: false; existing: ExistingGame };
