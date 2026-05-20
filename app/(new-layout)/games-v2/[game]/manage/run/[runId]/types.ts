import type {
    ResolvedGame,
    RunDetail,
} from '../../../../../../../types/leaderboards.types';

export interface ManageRunData {
    game: ResolvedGame;
    run: RunDetail;
}
