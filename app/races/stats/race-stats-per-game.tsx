import { GameStats } from "~app/races/races.types";

export const RaceStatsPerGame = ({
    globalGameStats,
}: {
    globalGameStats: GameStats[];
}) => {
    return (
        <div>
            {globalGameStats.map((stats) => {
                return <StatsPerGame key={stats.displayValue} stats={stats} />;
            })}
        </div>
    );
};

const StatsPerGame = ({ stats }: { stats: GameStats }) => {
    return <div>{stats.displayValue}</div>;
};
