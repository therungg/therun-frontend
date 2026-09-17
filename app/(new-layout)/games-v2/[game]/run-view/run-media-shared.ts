import { isEmbeddableVod } from '~src/lib/vod-url';
import type { RunViewModel } from './run-view';

/** Whether the run has a hero: an embeddable video or splits to chart. */
export function hasMedia(model: RunViewModel): boolean {
    return (
        (model.vodUrl != null && isEmbeddableVod(model.vodUrl)) ||
        model.splits.length > 0
    );
}
