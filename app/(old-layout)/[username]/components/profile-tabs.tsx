'use client';

import { GametimeForm } from '~src/components/gametime/gametime-form';
import styles from '../profile.module.scss';

interface ProfileTabsProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    tabs: { key: string; label: string }[];
    hasGameTime: boolean;
    useGameTime: boolean;
    setUseGameTime: (v: boolean) => void;
    gameCount: number;
    games: string[];
    currentGame: string;
    setCurrentGame: (game: string) => void;
}

export const ProfileTabs = ({
    activeTab,
    onTabChange,
    tabs,
    hasGameTime,
    useGameTime,
    setUseGameTime,
    gameCount,
    games,
    currentGame,
    setCurrentGame,
}: ProfileTabsProps) => {
    return (
        <div className={styles.profileTabs}>
            {tabs.map((tab) => (
                <button
                    key={tab.key}
                    type="button"
                    className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
                    onClick={() => onTabChange(tab.key)}
                >
                    {tab.label}
                </button>
            ))}
            <div className={styles.tabControls}>
                {hasGameTime && (
                    <GametimeForm
                        useGameTime={useGameTime}
                        setUseGameTime={setUseGameTime}
                    />
                )}
                {gameCount > 1 && (
                    <select
                        className="form-select form-select-sm"
                        style={{ maxWidth: '200px' }}
                        onChange={(e) =>
                            setCurrentGame(e.target.value.split('#')[0])
                        }
                        value={currentGame}
                    >
                        <option value="all-games">All Games</option>
                        {games.map((game) => (
                            <option key={game} value={game}>
                                {game.split('#')[0]}
                            </option>
                        ))}
                    </select>
                )}
            </div>
        </div>
    );
};
