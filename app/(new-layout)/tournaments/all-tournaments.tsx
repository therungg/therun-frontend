'use client';

import { useMemo, useState } from 'react';
import { Card, Col, Image, Row } from 'react-bootstrap';
import { Search as SearchIcon } from 'react-bootstrap-icons';
import { AllTournamentsProps } from '~app/(new-layout)/tournaments/all-tournaments.types';
import { CurrentTournaments } from '~app/(new-layout)/tournaments/current-tournaments';
import { FinishedTournaments } from '~app/(new-layout)/tournaments/finished-tournaments';
import { TournamentInfoBox } from '~app/(new-layout)/tournaments/tournament-info-box';
import { UpcomingTournaments } from '~app/(new-layout)/tournaments/upcoming-tournaments';
import styles from '~src/components/css/Tournament.module.scss';
import { Tournament } from '~src/components/tournament/tournament-info';
import { FromNow } from '~src/components/util/datetime';
import { safeEncodeURI } from '~src/utils/uri';
import listStyles from './tournaments-list.module.scss';

type TabKey = 'live' | 'upcoming' | 'finished' | 'all' | 'hidden';

function matchesSearch(t: Tournament, query: string): boolean {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    if ((t.name ?? '').toLowerCase().includes(q)) return true;
    if ((t.shortName ?? '').toLowerCase().includes(q)) return true;
    if ((t.organizer ?? '').toLowerCase().includes(q)) return true;
    return (t.eligibleRuns ?? []).some(
        (r) =>
            r.game.toLowerCase().includes(q) ||
            r.category.toLowerCase().includes(q),
    );
}

export const Tournaments = ({
    tournaments,
    isAdmin = false,
}: {
    tournaments: Tournament[];
    isAdmin?: boolean;
}) => {
    const sorted = [...tournaments].sort(
        (a, b) =>
            new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
    );

    const now = new Date().toISOString();

    const visible = sorted.filter((t) => !t.hide);
    const hiddenTournaments = sorted.filter((t) => t.hide);

    const finishedTournaments = visible.filter((t) => t.endDate < now);
    const ongoingTournaments = visible.filter(
        (t) => t.startDate < now && t.endDate > now,
    );
    const upcomingTournaments = visible.filter((t) => t.startDate > now);

    return (
        <AllTournaments
            allTournaments={visible}
            finishedTournaments={finishedTournaments}
            ongoingTournaments={ongoingTournaments}
            upcomingTournaments={upcomingTournaments}
            hiddenTournaments={hiddenTournaments}
            isAdmin={isAdmin}
        />
    );
};

export function AllTournaments({
    allTournaments,
    finishedTournaments,
    ongoingTournaments,
    upcomingTournaments,
    hiddenTournaments = [],
    isAdmin = false,
}: AllTournamentsProps & {
    allTournaments: Tournament[];
    hiddenTournaments?: Tournament[];
    isAdmin?: boolean;
}) {
    const [active, setActive] = useState<TabKey>(
        ongoingTournaments.length > 0 ? 'live' : 'upcoming',
    );
    const [search, setSearch] = useState('');

    const filteredOngoing = useMemo(
        () => ongoingTournaments.filter((t) => matchesSearch(t, search)),
        [ongoingTournaments, search],
    );
    const filteredUpcoming = useMemo(
        () => upcomingTournaments.filter((t) => matchesSearch(t, search)),
        [upcomingTournaments, search],
    );
    const filteredFinished = useMemo(
        () => finishedTournaments.filter((t) => matchesSearch(t, search)),
        [finishedTournaments, search],
    );
    const filteredAll = useMemo(
        () => allTournaments.filter((t) => matchesSearch(t, search)),
        [allTournaments, search],
    );
    const filteredHidden = useMemo(
        () => hiddenTournaments.filter((t) => matchesSearch(t, search)),
        [hiddenTournaments, search],
    );

    const tabs: Array<{ key: TabKey; label: string; count: number }> = [
        { key: 'live', label: 'Live', count: filteredOngoing.length },
        { key: 'upcoming', label: 'Upcoming', count: filteredUpcoming.length },
        {
            key: 'finished',
            label: 'Finished',
            count: filteredFinished.length,
        },
        { key: 'all', label: 'All', count: filteredAll.length },
    ];

    if (isAdmin) {
        tabs.push({
            key: 'hidden',
            label: 'Hidden',
            count: filteredHidden.length,
        });
    }

    const showUpcomingInFooter =
        active !== 'upcoming' && filteredUpcoming.length > 0;

    return (
        <div>
            <div className={listStyles.toolbar}>
                <div className={listStyles.titleGroup}>
                    <h1 className={listStyles.title}>Tournaments</h1>
                </div>
                <nav className={listStyles.tabBar} aria-label="Tournament tabs">
                    {tabs.map((t) => (
                        <button
                            key={t.key}
                            type="button"
                            className={
                                active === t.key
                                    ? `${listStyles.tab} ${listStyles.tabActive}`
                                    : listStyles.tab
                            }
                            onClick={() => setActive(t.key)}
                        >
                            {t.label}
                            <span className={listStyles.tabCount}>
                                {t.count}
                            </span>
                        </button>
                    ))}
                </nav>
                <div className={listStyles.search}>
                    <SearchIcon size={14} className={listStyles.searchIcon} />
                    <input
                        type="search"
                        placeholder="Search…"
                        className={listStyles.searchInput}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <section className={listStyles.section}>
                {active === 'live' && (
                    <FilteredSection
                        empty="No live tournaments right now."
                        tournaments={filteredOngoing}
                    >
                        <CurrentTournaments tournaments={filteredOngoing} />
                    </FilteredSection>
                )}
                {active === 'upcoming' && (
                    <FilteredSection
                        empty="No upcoming tournaments."
                        tournaments={filteredUpcoming}
                    >
                        <ListTournaments tournaments={filteredUpcoming} />
                    </FilteredSection>
                )}
                {active === 'finished' && (
                    <FilteredSection
                        empty="No finished tournaments match your search."
                        tournaments={filteredFinished}
                    >
                        <FinishedTournaments tournaments={filteredFinished} />
                    </FilteredSection>
                )}
                {active === 'all' && (
                    <FilteredSection
                        empty="No tournaments match your search."
                        tournaments={filteredAll}
                    >
                        <ListTournaments tournaments={filteredAll} />
                    </FilteredSection>
                )}
                {active === 'hidden' && isAdmin && (
                    <FilteredSection
                        empty="No hidden tournaments."
                        tournaments={filteredHidden}
                    >
                        <ListTournaments tournaments={filteredHidden} />
                    </FilteredSection>
                )}
            </section>

            {(showUpcomingInFooter || active === 'live') && (
                <div className={listStyles.footerRow}>
                    {showUpcomingInFooter && (
                        <UpcomingTournaments tournaments={filteredUpcoming} />
                    )}
                    <TournamentInfoBox />
                </div>
            )}
        </div>
    );
}

function FilteredSection({
    empty,
    tournaments,
    children,
}: {
    empty: string;
    tournaments: Tournament[];
    children: React.ReactNode;
}) {
    if (tournaments.length === 0) {
        return <div className={listStyles.empty}>{empty}</div>;
    }
    return <>{children}</>;
}

export const ListTournaments = ({
    tournaments,
}: {
    tournaments: Tournament[];
}) => {
    return (
        <Row className="g-3 mb-3">
            {tournaments.map((tournament: Tournament) => {
                const startDate = new Date(tournament.startDate);
                const endDate = new Date(tournament.endDate);
                const durationInDays = Math.round(
                    (endDate.getTime() - startDate.getTime()) /
                        (1000 * 60 * 60 * 24),
                );

                return (
                    <Col sm={12} lg={6} xxl={4} key={tournament.name}>
                        {tournament.logoUrl && (
                            <div
                                className="float-start d-none d-sm-flex align-items-center me-2"
                                style={{
                                    width: '135px',
                                    height: '135px',
                                    flexShrink: 0,
                                    overflow: 'hidden',
                                }}
                            >
                                <a
                                    href={`/tournaments/${safeEncodeURI(
                                        tournament.name,
                                    )}`}
                                    style={{
                                        display: 'flex',
                                        width: '100%',
                                        height: '100%',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Image
                                        alt="Tournament Logo"
                                        src={`/${tournament.logoUrl}`}
                                        style={{
                                            maxWidth: '100%',
                                            maxHeight: '100%',
                                            width: 'auto',
                                            height: 'auto',
                                            objectFit: 'contain',
                                        }}
                                    />
                                </a>
                            </div>
                        )}
                        <Card className={`${styles.listCard} card-columns`}>
                            <Card.Header className={styles.listCardHeader}>
                                <div className="overflow-hidden">
                                    <a
                                        href={`/tournaments/${safeEncodeURI(
                                            tournament.name,
                                        )}`}
                                        className="fs-large"
                                    >
                                        {tournament.shortName ||
                                            tournament.name}
                                    </a>
                                    <div className="float-end">
                                        <i className="align-self-center">
                                            <FromNow
                                                time={tournament.startDate}
                                            />
                                        </i>
                                    </div>
                                </div>
                            </Card.Header>
                            <Card.Body className={styles.listCardBody}>
                                <Row>
                                    <Col xs={5} md={6}>
                                        <b>Start Date:</b>
                                    </Col>
                                    <Col xs={7} md={6}>
                                        {startDate.toDateString()}
                                    </Col>
                                </Row>
                                <Row>
                                    <Col xs={5} md={6}>
                                        <b>End Date:</b>
                                    </Col>
                                    <Col xs={7} md={6}>
                                        {endDate.toDateString()}
                                    </Col>
                                </Row>
                                <Row>
                                    <Col xs={5} md={6}>
                                        <b>Duration:</b>
                                    </Col>
                                    <Col xs={7} md={6}>
                                        {durationInDays} days
                                    </Col>
                                </Row>
                            </Card.Body>
                        </Card>
                    </Col>
                );
            })}
        </Row>
    );
};
