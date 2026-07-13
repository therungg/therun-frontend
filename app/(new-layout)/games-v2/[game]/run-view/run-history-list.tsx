import moment from 'moment';
import { describeEvent } from '~src/lib/run-view/describe-event';
import type { HistoryEvent } from '../../../../../types/moderation.types';

export function RunHistoryList({ events }: { events: HistoryEvent[] }) {
    if (events.length === 0) return null;

    return (
        <section className="mt-4">
            <h2 className="h6">Run history</h2>
            <ul className="list-unstyled mb-0">
                {events.map((e, i) => (
                    <li
                        key={`${e.at}-${i}`}
                        className="border-start ps-3 pb-3 position-relative"
                    >
                        <div className="fw-semibold small">
                            {describeEvent(e)}
                        </div>
                        <div className="text-muted small">
                            {e.byRole} · {moment(e.at).fromNow()}
                        </div>
                        {e.reason && (
                            <div className="small fst-italic">“{e.reason}”</div>
                        )}
                    </li>
                ))}
            </ul>
        </section>
    );
}
