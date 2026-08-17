'use client';

import { createContext, type ReactNode, useContext, useState } from 'react';
import type { ResolvedCategory } from '../../../../../types/leaderboards.types';
import type { RailScope } from './rail-scope';
import styles from './sidebar.module.scss';

const RailScopeContext = createContext<RailScope>('game');

/**
 * One scope for every pulse panel in the rail (Live now, Recent PBs). Held in
 * context rather than in a wrapper so the panels can sit in different zones
 * of the rail (they split around the main column on narrow screens) and
 * still switch together. Defaults to the board on a board page.
 */
export function RailScopeProvider({
    board,
    children,
}: {
    board?: ResolvedCategory | null;
    children: ReactNode;
}) {
    const [scope, setScope] = useState<RailScope>(board ? 'board' : 'game');
    return (
        <RailScopeContext.Provider value={scope}>
            <ScopeSetter.Provider value={setScope}>
                {children}
            </ScopeSetter.Provider>
        </RailScopeContext.Provider>
    );
}

const ScopeSetter = createContext<(s: RailScope) => void>(() => {
    // No provider above: the switch is inert. Only reachable if ScopeSwitch
    // is rendered outside RailScopeProvider, which Sidebar never does.
});

export function useRailScope(): RailScope {
    return useContext(RailScopeContext);
}

/** The switch itself; rendered once, at the top of the pulse zone. */
export function ScopeSwitch({ board }: { board: ResolvedCategory }) {
    const scope = useRailScope();
    const setScope = useContext(ScopeSetter);
    return (
        <div
            className={styles.scopeSwitch}
            role="group"
            aria-label="Rail scope"
        >
            <button
                type="button"
                className={`${styles.scopeBtn} ${scope === 'board' ? styles.scopeBtnActive : ''}`}
                aria-pressed={scope === 'board'}
                onClick={() => setScope('board')}
            >
                {board.display}
            </button>
            <button
                type="button"
                className={`${styles.scopeBtn} ${scope === 'game' ? styles.scopeBtnActive : ''}`}
                aria-pressed={scope === 'game'}
                onClick={() => setScope('game')}
            >
                All boards
            </button>
        </div>
    );
}
