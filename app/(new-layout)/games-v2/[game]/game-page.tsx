import { VerifiedToggle } from './filters/verified-toggle';
import { CategoryPills } from './header/category-pills';
import { GameHeader } from './header/game-header';
import { LeaderboardTable } from './leaderboard/leaderboard-table';
import { PaginationBar } from './leaderboard/pagination-bar';
import type { GamePageData } from './types';

interface Props {
    data: GamePageData;
}

export function GamePage({ data }: Props) {
    if (data.categories.length === 0) {
        return (
            <div>
                <GameHeader game={data.game} stats={data.quickStats} />
                <p className="text-center text-muted my-5">
                    No runs uploaded for this game yet.
                </p>
            </div>
        );
    }

    const primary =
        data.selectedCategory.primaryTiming === 'gt'
            ? data.leaderboardGt
            : data.leaderboardRt;

    return (
        <div>
            <GameHeader game={data.game} stats={data.quickStats} />
            <CategoryPills
                categories={data.categories}
                selectedCategoryName={data.selectedCategory.name}
            />
            <div className="row">
                <div className="col-lg-8">
                    <VerifiedToggle verified={data.activeFilters.verified} />
                    <LeaderboardTable
                        rt={data.leaderboardRt}
                        gt={data.leaderboardGt}
                        category={data.selectedCategory}
                        sessionUsername={data.sessionUsername}
                    />
                    <PaginationBar
                        page={primary.page}
                        totalPages={primary.totalPages}
                    />
                </div>
                <div className="col-lg-4">
                    {/* Sidebar slot — Task 4 */}
                    <div className="border rounded p-4 text-center text-muted">
                        Sidebar
                    </div>
                </div>
            </div>
        </div>
    );
}
