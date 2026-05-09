import type { LiveRun } from '~app/(new-layout)/live/live.types';

interface Props {
    runners: LiveRun[];
}

export function LivePanel({ runners }: Props) {
    if (runners.length === 0) {
        return (
            <section className="border rounded p-3 mb-3">
                <small className="text-muted d-block mb-2">Live now</small>
                <p className="text-muted mb-0">
                    No one is live for this game right now.
                </p>
            </section>
        );
    }

    const top = runners.slice(0, 5);

    return (
        <section className="border rounded p-3 mb-3">
            <div className="d-flex justify-content-between align-items-baseline mb-2">
                <small className="text-muted">Live now</small>
                {runners.length > 5 && (
                    <small className="text-muted">{runners.length} total</small>
                )}
            </div>
            <ul className="list-unstyled mb-0">
                {top.map((r) => (
                    <li
                        key={r.user}
                        className="d-flex justify-content-between align-items-baseline"
                    >
                        <a
                            href={r.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-decoration-none"
                        >
                            {r.user}
                        </a>
                        {r.category && (
                            <small className="text-muted">{r.category}</small>
                        )}
                    </li>
                ))}
            </ul>
        </section>
    );
}
