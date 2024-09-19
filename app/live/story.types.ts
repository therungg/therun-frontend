import { RunMetadata } from "../handle-splits/construct-metadata";
import { StoryElementType } from "./story-elements/story-element-types";

export interface Story {
    user: string;
    startedAt: number;
    partition: "global";
    increment: number;
    userIncrement: number;
    raceId?: string;
    tournament?: string;
    runMetadata: RunMetadata;
    selectedStoryTypes: string[];
}

export interface StoryWithSplitsStories extends Story {
    stories: SplitStory[];
}

export type StoryWithoutIncrements = Omit<
    Story,
    "increment" | "userIncrement" | "partition" | "selectedStoryTypes"
>;

export interface SplitStory {
    user: string;
    userSearch: string;
    "startedAt#index": string;
    splitName: string;
    splitIndex: number;
    previousSplitName?: string;
    previousSplitIndex?: number;
    storyElements: StoryElementWithSelected[];
    splitSignificance: number;
    // splitMetadata: SplitsMeta; //todo:  shouldn't be this type
    type: SplitsStoryType;
}

export type SplitsStoryType =
    | "start"
    | "normal"
    | "last"
    | "finished"
    | "reset";

export type StoryElementCategory =
    | "start"
    | "generic"
    | "next"
    | "previous"
    | "last"
    | "finished"
    | "reset";

export interface StoryElement {
    id: string;
    type: StoryElementType;
    category: StoryElementCategory;
    text: string;
    weight: number;
    rarity: StoryElementRarity;
}

export interface StoryElementWithSelected extends StoryElement {
    selected: boolean;
}

type StoryElementRarity =
    | "common"
    | "rare"
    | "super"
    | "ultra"
    | "ultimate"
    | "secret";

export interface PaginatedStories {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    items: Story[];
}
