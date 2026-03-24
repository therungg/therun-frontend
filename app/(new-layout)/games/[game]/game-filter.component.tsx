'use client';
import React from 'react';
import styles from '~src/components/css/Game.module.scss';
import { GameContext } from './game.context';

export const GameFilter: React.FunctionComponent = () => {
    const { category, setCategory, categories } = React.useContext(GameContext);
    return (
        <div className={styles.navigation}>
            <div className={styles.form}>
                <select
                    className="form-select"
                    onChange={(e) => {
                        setCategory(e.target.value);
                    }}
                    value={category}
                >
                    <option key="*" title="All Categories" value="*">
                        Select a Category
                    </option>
                    {categories.map((leaderboard) => {
                        const display = leaderboard.categoryNameDisplay;
                        const name = leaderboard.categoryName;
                        return (
                            <option key={name} value={name}>
                                {display} &nbsp;
                            </option>
                        );
                    })}
                </select>
            </div>
        </div>
    );
};
