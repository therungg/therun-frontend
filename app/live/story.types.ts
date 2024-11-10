import { Run } from "~src/common/types";

export interface WebsocketStoryMessage<T extends Story | SplitStory> {
    type: "story" | "split";
    user: string;
    storyId: number;
    data: T;
}

export interface Story {
    user: string;
    startedAt: number;
    partition: "global";
    increment: number;
    userIncrement: number;
    raceId?: string;
    tournament?: string;
    runMetadata: Run;
    selectedStoryTypes: SelectedStoryTypes[];
}

export interface StoryWithSplitsStories extends Story {
    stories: SplitStory[];
}

export type SelectedStoryTypes = {
    type: StoryElementType;
    timestamp: number;
};

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

export type StoryElementStartTypes = "welcome";

export type StoryElementGenericTypes =
    | "run_generic_total_attempts"
    | "run_generic_finish_percentage"
    | "run_generic_last_run_finished"
    | "run_generic_first_run_of_day"
    | "run_generic_nth_run_of_session"
    | "run_generic_participated_in_n_races"
    | "run_generic_recently_participated_in_race"
    | "run_generic_recently_participated_in_tournament"
    | "run_generic_first_run_date"
    | "run_generic_total_playtime"
    | "run_generic_total_playtime_current_session"
    | "run_generic_total_games_categories_by_player"
    | "run_generic_player_pb"
    | "run_generic_player_sob"
    | "run_generic_reset_count_before_run"
    | "run_generic_current_comparison"
    | "run_generic_is_streaming";

export type StoryElementBeforeSplitType =
    | "run_before_split_reset_percentage"
    | "run_before_split_consistency"
    | "run_before_split_best_time"
    | "run_before_split_average_time"
    | "run_before_split_timesave_potential"
    | "run_before_split_previous_times"
    | "run_before_split_pb_split_info";

export type StoryElementAfterSplitType =
    | "run_after_split_saved_time"
    | "run_after_split_lost_time"
    | "run_after_split_ahead_now"
    | "run_after_split_behind_now"
    | "run_after_split_gold"
    | "run_after_split_top_n_percent_split"
    | "run_after_split_top_n_percent_run"
    | "run_after_split_close_to_gold"
    | "run_after_split_multiple_saves"
    | "run_after_split_best_possible_time"
    | "run_after_split_halfway";

export type StoryElementType =
    | StoryElementStartTypes
    | StoryElementGenericTypes
    | StoryElementBeforeSplitType
    | StoryElementAfterSplitType;

export interface PaginatedStories {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    items: Story[];
}

export interface StoryPreferences {
    enabled: boolean;
}
