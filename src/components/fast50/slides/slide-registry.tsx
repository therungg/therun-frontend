import type { SlideComponent } from '../deck/deck';
import type { SlideId } from '../deck/evaluators';
import { DangerZoneSlide } from './danger-zone-slide';
import { ForecastSlide } from './forecast-slide';
import { FormCheckSlide } from './form-check-slide';
import { GoldRushSlide } from './gold-rush-slide';
import { GrindSlide } from './grind-slide';
import { IntroSlide } from './intro-slide';
import { OneShotSlide } from './one-shot-slide';
import { ProfileSlide } from './profile-slide';
import { ResultSlide } from './result-slide';
import { RoadmapSlide } from './roadmap-slide';
import { StoryOfRunSlide } from './story-of-run-slide';
import { SurvivedSlide } from './survived-slide';
import { TheTableSlide } from './the-table-slide';
import { WhereItLandsSlide } from './where-it-lands-slide';
import { WorldClassSlide } from './world-class-slide';
import { ZoomOutSlide } from './zoom-out-slide';

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
    'where-it-lands': WhereItLandsSlide,
    survived: SurvivedSlide,
    'gold-rush': GoldRushSlide,
    'story-of-run': StoryOfRunSlide,
    'the-table': TheTableSlide,
    'zoom-out': ZoomOutSlide,
};
