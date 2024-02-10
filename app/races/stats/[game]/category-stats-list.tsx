import { GameStats } from "~app/races/races.types";
import styles from "~src/components/css/LiveRun.module.scss";

// Should paginate this on the client side
export const CategoryStatsList = ({ stats }: { stats: GameStats[] }) => {
    return (
        <div className={"mt-4"}>
            {stats.map((gameStats) => {
                return (
                    <CategoryStatsPanel
                        key={gameStats.value}
                        stats={gameStats}
                    />
                );
            })}
        </div>
    );
};

export const CategoryStatsPanel = ({ stats }: { stats: GameStats }) => {
    const [game, category] = stats.displayValue.split("#");
    return (
        <a
            href={`/races/stats/${game}/${category}`}
            className={"text-decoration-none"}
        >
            <div
                className={`bg-body-secondary game-border mh-100 h-100 card game-border mt-2 px-3 py-2 ${styles.liveRunContainer}`}
            >
                <div className={"justify-content-between d-flex"}>
                    <span className={"fs-5"}>{category}</span>
                    <span>{stats.totalRaces} Races</span>
                </div>
                <hr className={"mt-1 p-0"} />
            </div>
        </a>
    );
};
