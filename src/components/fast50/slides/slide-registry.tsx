import type { SlideComponent } from '../deck/deck';
import type { SlideId } from '../deck/evaluators';
import { DangerZoneSlide } from './danger-zone-slide';
import { ForecastSlide } from './forecast-slide';
import { FormCheckSlide } from './form-check-slide';
import { GrindSlide } from './grind-slide';
import { IntroSlide } from './intro-slide';
import { OneShotSlide } from './one-shot-slide';
import { ProfileSlide } from './profile-slide';
import { ResultSlide } from './result-slide';
import { RoadmapSlide } from './roadmap-slide';
import { WorldClassSlide } from './world-class-slide';

export const SLIDE_COMPONENTS: Partial<Record<SlideId, SlideComponent>> = {
    intro: IntroSlide,
    roadmap: RoadmapSlide,
    grind: GrindSlide,
    'one-shot': OneShotSlide,
    'danger-zone': DangerZoneSlide,
    'world-class': WorldClassSlide,
    profile: ProfileSlide,
    forecast: ForecastSlide,
    'form-check': FormCheckSlide,
    result: ResultSlide,
};
