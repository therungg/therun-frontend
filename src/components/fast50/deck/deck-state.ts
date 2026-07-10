export interface DeckState {
    slideIndex: number;
    stage: number;
    blackout: boolean;
}

export interface DeckAction {
    type: 'ADVANCE' | 'BACK' | 'TOGGLE_BLACKOUT' | 'GOTO';
    slideCount: number;
    stagesPerSlide: number;
    index?: number;
}

export const STAGES_PER_SLIDE = 3;

export const initialDeckState: DeckState = {
    slideIndex: 0,
    stage: 0,
    blackout: false,
};

export const deckReducer = (
    state: DeckState,
    action: DeckAction,
): DeckState => {
    const lastStage = action.stagesPerSlide - 1;
    const lastSlide = action.slideCount - 1;
    switch (action.type) {
        case 'ADVANCE': {
            if (state.blackout) return { ...state, blackout: false };
            if (state.stage < lastStage)
                return { ...state, stage: state.stage + 1 };
            if (state.slideIndex < lastSlide)
                return { ...state, slideIndex: state.slideIndex + 1, stage: 0 };
            return state;
        }
        case 'BACK': {
            if (state.slideIndex > 0)
                return {
                    ...state,
                    slideIndex: state.slideIndex - 1,
                    stage: lastStage,
                };
            return { ...state, stage: lastStage };
        }
        case 'GOTO':
            return {
                ...state,
                slideIndex: Math.min(Math.max(action.index ?? 0, 0), lastSlide),
                stage: lastStage,
            };
        case 'TOGGLE_BLACKOUT':
            return { ...state, blackout: !state.blackout };
    }
};
