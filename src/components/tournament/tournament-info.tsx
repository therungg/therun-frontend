import moment from 'moment';
import React from 'react';
import { PatreonBunnySvg } from '~app/(new-layout)/patron/patreon-info';
import { GameLink } from '~src/components/links/links';
import {
    getPeriodLabel,
    getPeriodNoun,
    periodStatus,
} from '~src/lib/tournament-periods';
import detailStyles from '../../../app/(new-layout)/tournaments/[tournament]/tournament-detail.module.scss';
import type { Tournament } from '../../../types/tournament.types';

export type { Tournament } from '../../../types/tournament.types';

export const TournamentInfo = ({ tournament }: { tournament: Tournament }) => {
    const periods = tournament.eligiblePeriods ?? [];
    const now = Date.now();
    const noun = getPeriodNoun(tournament);

    const sections: React.ReactNode[] = [];

    if (tournament.description) {
        sections.push(
            <section key="desc" className={detailStyles.section}>
                <header className={detailStyles.sectionHeader}>
                    <h2 className={detailStyles.sectionTitle}>About</h2>
                </header>
                <div
                    className={detailStyles.descriptionBody}
                    dangerouslySetInnerHTML={{ __html: tournament.description }}
                />
            </section>,
        );
    }

    sections.push(
        <section key="sched" className={detailStyles.section}>
            <header className={detailStyles.sectionHeader}>
                <h2 className={detailStyles.sectionTitle}>
                    Schedule
                    <span className={detailStyles.sectionEyebrow}>
                        {periods.length > 1
                            ? `${periods.length} ${noun.plural}`
                            : 'Single window'}
                    </span>
                </h2>
            </header>
            <div className={detailStyles.timeline}>
                {periods.map((period, i) => {
                    const status = periodStatus(period, now);
                    const dotClass =
                        status === 'active'
                            ? `${detailStyles.timelineDot} ${detailStyles.timelineDotActive}`
                            : status === 'past'
                              ? `${detailStyles.timelineDot} ${detailStyles.timelineDotPast}`
                              : detailStyles.timelineDot;
                    const cardClass =
                        status === 'active'
                            ? `${detailStyles.timelineCard} ${detailStyles.timelineCardActive}`
                            : detailStyles.timelineCard;
                    return (
                        <div
                            key={`${period.startDate}-${period.endDate}-${i}`}
                            className={detailStyles.timelineItem}
                        >
                            <div className={detailStyles.timelineMarker}>
                                <span className={dotClass} />
                                {i < periods.length - 1 && (
                                    <span
                                        className={detailStyles.timelineLine}
                                    />
                                )}
                            </div>
                            <div className={cardClass}>
                                <div className={detailStyles.timelineHeading}>
                                    <span
                                        className={detailStyles.timelineTitle}
                                    >
                                        {getPeriodLabel(tournament, i)}
                                    </span>
                                    <span
                                        className={detailStyles.timelineLabel}
                                    >
                                        {status === 'active'
                                            ? 'Now'
                                            : status === 'past'
                                              ? 'Ended'
                                              : 'Upcoming'}
                                    </span>
                                </div>
                                <div className={detailStyles.timelineRange}>
                                    {moment(period.startDate).format('LLL')} —{' '}
                                    {moment(period.endDate).format('LLL')}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>,
    );

    sections.push(
        <section key="runs" className={detailStyles.section}>
            <header className={detailStyles.sectionHeader}>
                <h2 className={detailStyles.sectionTitle}>
                    Eligible runs
                    <span className={detailStyles.sectionEyebrow}>
                        {tournament.eligibleRuns?.length ?? 0} combo
                        {(tournament.eligibleRuns?.length ?? 0) === 1
                            ? ''
                            : 's'}
                    </span>
                </h2>
            </header>
            <div className={detailStyles.eligibleGrid}>
                {(tournament.eligibleRuns ?? []).map((r, i) => (
                    <div
                        key={`${r.game}|${r.category}`}
                        className={`${detailStyles.eligibleTile} ${
                            i === 0 ? detailStyles.eligibleTilePrimary : ''
                        }`}
                    >
                        <div className={detailStyles.eligibleGameRow}>
                            <span className={detailStyles.eligibleIndex}>
                                {i === 0 ? 'Main' : `#${i + 1}`}
                            </span>
                        </div>
                        <div className={detailStyles.eligibleGame}>
                            <GameLink game={r.game} />
                        </div>
                        <div className={detailStyles.eligibleCategory}>
                            {r.category}
                        </div>
                    </div>
                ))}
            </div>
        </section>,
    );

    if (tournament.rules && tournament.rules.length > 0) {
        sections.push(
            <section key="rules" className={detailStyles.section}>
                <header className={detailStyles.sectionHeader}>
                    <h2 className={detailStyles.sectionTitle}>Rules</h2>
                </header>
                <ul className={detailStyles.rulesList}>
                    {tournament.rules.map((rule, i) => {
                        try {
                            const urlRule = new URL(rule);
                            return (
                                <li key={`${rule}-${i}`}>
                                    <a
                                        href={urlRule.toString()}
                                        target="_blank"
                                        rel="nofollow noreferrer"
                                    >
                                        {urlRule.hostname}
                                        {urlRule.pathname}
                                    </a>
                                </li>
                            );
                        } catch (_) {
                            return <li key={`${rule}-${i}`}>{rule}</li>;
                        }
                    })}
                </ul>
            </section>,
        );
    }

    if (
        tournament.pointDistribution &&
        tournament.pointDistribution.length > 0
    ) {
        sections.push(
            <section key="points" className={detailStyles.section}>
                <header className={detailStyles.sectionHeader}>
                    <h2 className={detailStyles.sectionTitle}>
                        Points distribution
                    </h2>
                </header>
                <div className={detailStyles.eligibleGrid}>
                    {tournament.pointDistribution.map((points, key) => {
                        const place = key + 1;
                        const suffix =
                            place === 1
                                ? 'st'
                                : place === 2
                                  ? 'nd'
                                  : place === 3
                                    ? 'rd'
                                    : 'th';
                        return (
                            <div
                                key={key}
                                className={`${detailStyles.eligibleTile} ${
                                    key === 0
                                        ? detailStyles.eligibleTilePrimary
                                        : ''
                                }`}
                            >
                                <div className={detailStyles.eligibleIndex}>
                                    {place}
                                    {suffix}
                                </div>
                                <div className={detailStyles.eligibleGame}>
                                    {points} pts
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>,
        );
    }

    const moderators = tournament.moderators ?? [];
    const admins = tournament.admins ?? [];
    const eligibleUsers = tournament.eligibleUsers ?? [];

    if (moderators.length > 0 || admins.length > 0) {
        sections.push(
            <section key="people" className={detailStyles.section}>
                <header className={detailStyles.sectionHeader}>
                    <h2 className={detailStyles.sectionTitle}>People</h2>
                </header>
                <div className={detailStyles.eligibleGrid}>
                    {admins.length > 0 && (
                        <div className={detailStyles.eligibleTile}>
                            <span className={detailStyles.eligibleIndex}>
                                Admins
                            </span>
                            <div
                                style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '0.4rem',
                                }}
                            >
                                {admins.map((a) => (
                                    <a
                                        key={a}
                                        href={`/${a}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={detailStyles.gameChip}
                                    >
                                        {a}
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                    {moderators.length > 0 && (
                        <div className={detailStyles.eligibleTile}>
                            <span className={detailStyles.eligibleIndex}>
                                Moderators
                            </span>
                            <div
                                style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '0.4rem',
                                }}
                            >
                                {moderators.map((m) => (
                                    <a
                                        key={m}
                                        href={`/${m}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={detailStyles.gameChip}
                                    >
                                        {m}
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </section>,
        );
    }

    if (eligibleUsers.length > 0) {
        sections.push(
            <section key="runners" className={detailStyles.section}>
                <header className={detailStyles.sectionHeader}>
                    <h2 className={detailStyles.sectionTitle}>
                        Runners
                        <span className={detailStyles.sectionEyebrow}>
                            {eligibleUsers.length} signed up
                        </span>
                    </h2>
                </header>
                <div
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.4rem',
                    }}
                >
                    {eligibleUsers.map((u) => (
                        <a
                            key={u}
                            href={`/${u}`}
                            target="_blank"
                            rel="noreferrer"
                            className={detailStyles.gameChip}
                        >
                            {u}
                        </a>
                    ))}
                </div>
            </section>,
        );
    }

    sections.push(
        <section key="patreon" className={detailStyles.section}>
            <header className={detailStyles.sectionHeader}>
                <h2 className={detailStyles.sectionTitle}>Support therun.gg</h2>
            </header>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                }}
            >
                <PatreonBunnySvg size={80} />
                <div
                    style={{
                        fontSize: '0.9rem',
                        color: 'var(--bs-secondary-color)',
                        lineHeight: 1.5,
                    }}
                >
                    therun.gg is free and ad-free. If you want to keep
                    tournament tooling like this alive, consider supporting on
                    Patreon.
                </div>
            </div>
        </section>,
    );

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
            }}
        >
            {sections}
        </div>
    );
};
