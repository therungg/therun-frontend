'use client';

import React, { useEffect } from 'react';
import { Col, Row } from 'react-bootstrap';
import { RaceActions } from '~app/(new-layout)/races/[race]/race-actions';
import { RaceAdminActions } from '~app/(new-layout)/races/[race]/race-admin-actions';
import { RaceChat } from '~app/(new-layout)/races/[race]/race-chat';
import { RaceCommentaryDrawerHost } from '~app/(new-layout)/races/[race]/race-commentary-drawer-host';
import { RaceFocusedRunner } from '~app/(new-layout)/races/[race]/race-focused-runner';
import { RaceHeader } from '~app/(new-layout)/races/[race]/race-header';
import { RaceParticipantDetail } from '~app/(new-layout)/races/[race]/race-participant-detail';
import { RaceParticipantOverview } from '~app/(new-layout)/races/[race]/race-participant-overview';
import { RaceProgressGraph } from '~app/(new-layout)/races/[race]/race-progress-graph';
import { RaceStartConditionInformation } from '~app/(new-layout)/races/[race]/race-start-condition-information';
import { RaceStats } from '~app/(new-layout)/races/[race]/race-stats';
import { RaceTimer } from '~app/(new-layout)/races/[race]/race-timer';
import { TeamLobby } from '~app/(new-layout)/races/[race]/teams/team-lobby';
import { TeamResults } from '~app/(new-layout)/races/[race]/teams/team-results';
import { useRace } from '~app/(new-layout)/races/hooks/use-race';
import { Race, RaceMessage } from '~app/(new-layout)/races/races.types';
import {
    Breadcrumb,
    BreadcrumbItem,
} from '~src/components/breadcrumbs/breadcrumb';
import { getRaceMessages } from '~src/lib/races';
import { User } from '../../../../types/session.types';

interface RaceDetailProps {
    race: Race;
    user?: User;
    messages: RaceMessage[];
}

export const RaceDetail = ({ race, user, messages }: RaceDetailProps) => {
    const { raceState, messagesState, setMessagesState } = useRace(
        race,
        messages,
    );

    const breadcrumbs: BreadcrumbItem[] = [
        { content: 'Races', href: '/races' },
        { content: race.raceId },
    ];

    const hasManyParticipants = race.participants?.filter(
        (participant) => !!participant.liveData,
    );
    const participantHasManySplits = race.participants?.find(
        (participant) =>
            participant.liveData && participant.liveData.totalSplits > 200,
    );

    const shouldSkipFetching = hasManyParticipants && participantHasManySplits;

    useEffect(() => {
        const fetchRaceMessages = async () => {
            if (!shouldSkipFetching) {
                const res = await getRaceMessages(race.raceId);
                setMessagesState(res);
            }
        };

        fetchRaceMessages();
    }, []);

    return (
        <RaceCommentaryDrawerHost race={raceState}>
            <Breadcrumb breadcrumbs={breadcrumbs} />
            <Row>
                <Col xxl={8} lg={7} xs={12}>
                    <RaceHeader race={raceState} />
                    <Col className="flex-center justify-content-between py-2">
                        {raceState.status !== 'pending' && (
                            <div className="fs-1 align-self-center">
                                <RaceTimer race={raceState} />
                            </div>
                        )}
                        {raceState.status === 'pending' && (
                            <div className="fs-3 align-self-center">
                                <RaceStartConditionInformation
                                    race={raceState}
                                />
                            </div>
                        )}
                    </Col>
                    <RaceFocusedRunner />
                    <div className="d-lg-none">
                        {raceState.isTeamRace &&
                            raceState.status === 'pending' && (
                                <TeamLobby race={raceState} user={user} />
                            )}
                        {raceState.isTeamRace &&
                            raceState.status === 'finished' &&
                            raceState.teamResults && (
                                <TeamResults race={raceState} />
                            )}
                        <RaceParticipantOverview race={raceState} />
                        <RaceActions race={raceState} user={user} />
                        <RaceChat
                            user={user}
                            raceMessages={messagesState}
                            race={raceState}
                        />
                        <RaceStats race={race} />
                    </div>
                    {raceState.isTeamRace && raceState.status === 'pending' && (
                        <TeamLobby race={raceState} user={user} />
                    )}
                    {raceState.isTeamRace &&
                        raceState.status === 'finished' &&
                        raceState.teamResults && (
                            <TeamResults race={raceState} />
                        )}
                    <div className="pb-4">
                        <RaceParticipantDetail race={raceState} />
                    </div>
                    <div className="pb-4 d-none d-sm-block">
                        <RaceProgressGraph
                            race={raceState}
                            messages={messagesState}
                        />
                    </div>
                </Col>
                <Col xxl={4} lg={5} className="d-none d-lg-block">
                    <RaceParticipantOverview race={raceState} />
                    <RaceActions race={raceState} user={user} />
                    <RaceAdminActions race={raceState} user={user} />
                    <RaceChat
                        raceMessages={messagesState}
                        race={raceState}
                        user={user}
                    />
                    <RaceStats race={race} />
                </Col>
            </Row>
        </RaceCommentaryDrawerHost>
    );
};
