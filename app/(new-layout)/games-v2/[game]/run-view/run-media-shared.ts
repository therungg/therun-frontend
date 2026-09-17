import { isEmbeddableVod } from '~src/lib/vod-url';
import type { RunViewModel } from './run-view';

/** Whether the run has a video to embed at the top of the page. */
export function hasMedia(model: RunViewModel): boolean {
    return model.vodUrl != null && isEmbeddableVod(model.vodUrl);
}
