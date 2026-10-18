import { isEmbeddableVod, videoList } from '~src/lib/vod-url';
import type { RunViewModel } from './run-view';

/** Every video the run carries, `vodUrl` first; empty when it has none. */
export function runVideos(model: RunViewModel): string[] {
    return videoList(model);
}

/** Whether the run has a video to embed at the top of the page. */
export function hasMedia(model: RunViewModel): boolean {
    return runVideos(model).some(isEmbeddableVod);
}
