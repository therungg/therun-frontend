import Image from 'next/image';
import { Panel } from '~app/(new-layout)/components/panel.component';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted, FromNow } from '~src/components/util/datetime';
import {
    type FinishedRunPB,
    getGameImageMap,
    getRecentNotablePBs,
} from '~src/lib/highlights';

export async function HighlightsFeed() {
    const [pbs, gameImages] = await Promise.all([
        getRecentNotablePBs(20),
        getGameImageMap(),
    ]);

    return (
        <Panel
            subtitle="From the top 100 categories"
            title="Recent Notable PBs"
            className="p-0"
        >
            <div className="p-3 d-flex flex-column gap-2">
                {pbs.map((pb) => (
                    <PBCard
                        key={pb.id}
                        pb={pb}
                        gameImage={gameImages[pb.game]}
                    />
                ))}
            </div>
        </Panel>
    );
}

function PBCard({ pb, gameImage }: { pb: FinishedRunPB; gameImage?: string }) {
    const imageUrl = gameImage || '/logo_dark_theme_no_text_transparent.png';

    const improvement = pb.previousPb !== null ? pb.previousPb - pb.time : null;

    return (
        <div className="border rounded-3 px-2 py-2 d-flex align-items-center gap-3">
            {/* Game image */}
            <div
                style={{
                    width: 50,
                    height: 65,
                    position: 'relative',
                    minWidth: 50,
                    borderRadius: 8,
                    overflow: 'hidden',
                    flexShrink: 0,
                }}
            >
                <Image
                    src={imageUrl}
                    fill
                    style={{ objectFit: 'cover' }}
                    alt={pb.game}
                />
            </div>

            {/* Content */}
            <div
                className="d-flex flex-column flex-grow-1"
                style={{ minWidth: 0 }}
            >
                {/* Row 1: Game + Category */}
                <div className="d-flex align-items-center gap-2 flex-wrap">
                    <span
                        className="fw-bold text-truncate"
                        style={{ maxWidth: '200px' }}
                    >
                        {pb.game}
                    </span>
                    <span
                        className="badge rounded-pill text-bg-secondary"
                        style={{ fontSize: '0.7rem' }}
                    >
                        {pb.category}
                    </span>
                </div>

                {/* Row 2: Runner */}
                <div className="d-flex align-items-center gap-2 mt-1">
                    <UserLink username={pb.username}>
                        <span
                            className="fw-semibold"
                            style={{ color: 'var(--bs-primary)' }}
                        >
                            {pb.username}
                        </span>
                    </UserLink>
                    <span
                        className="text-muted"
                        style={{ fontSize: '0.75rem' }}
                    >
                        <FromNow time={pb.endedAt} />
                    </span>
                </div>

                {/* Row 3: Time + Context */}
                <div className="d-flex align-items-center gap-2 mt-1">
                    <span
                        className="badge text-bg-primary fw-bold"
                        style={{ fontSize: '0.8rem' }}
                    >
                        <DurationToFormatted duration={pb.time.toString()} />
                    </span>
                    {improvement !== null && improvement > 0 && (
                        <span
                            className="fw-semibold"
                            style={{
                                color: 'var(--bs-success)',
                                fontSize: '0.8rem',
                            }}
                        >
                            -
                            <DurationToFormatted
                                duration={improvement.toString()}
                            />
                        </span>
                    )}
                    {pb.previousPb === null && (
                        <span
                            className="badge text-bg-info"
                            style={{ fontSize: '0.7rem' }}
                        >
                            First PB
                        </span>
                    )}
                    {pb.attemptCount > 100 && (
                        <span
                            className="text-muted"
                            style={{ fontSize: '0.7rem' }}
                        >
                            {pb.attemptCount.toLocaleString()} attempts
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
