import { CategoryPills } from './header/category-pills';
import { GameHeader } from './header/game-header';
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

    return (
        <div>
            <GameHeader game={data.game} stats={data.quickStats} />
            <CategoryPills
                categories={data.categories}
                selectedCategoryName={data.selectedCategory.name}
            />
            <div className="row">
                <div className="col-lg-8">
                    {/* Filter bar slot — Task 5 */}
                    {/* Leaderboard slot — Task 3 */}
                    <div className="border rounded p-4 text-center text-muted">
                        Leaderboard for{' '}
                        <strong>{data.selectedCategory.display}</strong> goes
                        here.
                    </div>
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
