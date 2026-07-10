import type { SlideComponent } from '../deck/deck';
import type { SlideId } from '../deck/evaluators';
import { IntroSlide } from './intro-slide';
import { ResultSlide } from './result-slide';
import { RoadmapSlide } from './roadmap-slide';

export const SLIDE_COMPONENTS: Partial<Record<SlideId, SlideComponent>> = {
    intro: IntroSlide,
    roadmap: RoadmapSlide,
    result: ResultSlide,
};
