'use client';

import type { ManageTab } from './types';

interface Props {
    activeTab: ManageTab;
    onChange: (tab: ManageTab) => void;
}

export function TabStrip({ activeTab, onChange }: Props) {
    return (
        <ul className="nav nav-tabs mb-3">
            <li className="nav-item">
                <button
                    type="button"
                    className={`nav-link ${activeTab === 'game' ? 'active' : ''}`}
                    onClick={() => onChange('game')}
                >
                    Game
                </button>
            </li>
            <li className="nav-item">
                <button
                    type="button"
                    className={`nav-link ${activeTab === 'category' ? 'active' : ''}`}
                    onClick={() => onChange('category')}
                >
                    Category
                </button>
            </li>
        </ul>
    );
}
