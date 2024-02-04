import {
    Race,
    RaceMessage,
    RaceParticipant,
    RaceParticipantWithLiveData,
    WebsocketRaceMessage,
} from "~app/races/races.types";
import { useEffect, useState } from "react";
import {
    useAllRacesWebsocket,
    useRaceWebsocket,
} from "~src/components/websocket/use-reconnect-websocket";
import { sortRaceParticipants } from "~app/races/[race]/sort-race-participants";

const raceMessageIsValid = (
    message: WebsocketRaceMessage<Race | RaceParticipant | RaceMessage>,
) => {
    return message !== null && message.data && message.data.raceId;
};
export const useRace = (race: Race, messages: RaceMessage[]) => {
    const [raceState, setRaceState] = useState(race);
    const [messagesState, setMessagesState] = useState(messages);

    const lastMessage = useRaceWebsocket(raceState.raceId);

    useEffect(() => {
        if (raceMessageIsValid(lastMessage)) {
            if (lastMessage.type === "participantUpdate") {
                const newParticipant: RaceParticipantWithLiveData =
                    lastMessage.data as RaceParticipantWithLiveData;

                const index = raceState.participants?.findIndex(
                    (participant) => participant.user === newParticipant.user,
                );

                const newRace = { ...raceState };

                if (index !== undefined && index > -1) {
                    if (newParticipant.status === "unjoined") {
                        newRace.participants?.splice(index, 1);
                    } else {
                        (newRace.participants as RaceParticipantWithLiveData[])[
                            index
                        ] = newParticipant;
                    }
                } else {
                    newRace.participants?.push(newParticipant);
                }

                newRace.participants = sortRaceParticipants(newRace);

                setRaceState(newRace);
            }
            if (lastMessage.type === "raceUpdate") {
                const newRace: Race = {
                    ...raceState,
                    ...lastMessage.data,
                } as Race;

                newRace.participants = sortRaceParticipants(raceState);
                setRaceState(newRace);
            }
            if (lastMessage.type === "message") {
                const newMessages = [...messagesState];
                newMessages.unshift(lastMessage.data as RaceMessage);
                setMessagesState(newMessages);
            }
        }
    }, [lastMessage]);

    return { raceState, messagesState };
};

export const useRaces = (races: Race[]) => {
    const [stateRaces, setStateRaces] = useState(races);
    const lastMessage = useAllRacesWebsocket();

    useEffect(() => {
        if (raceMessageIsValid(lastMessage)) {
            const newRaces = JSON.parse(JSON.stringify(stateRaces));

            if (lastMessage.type === "participantUpdate") {
                const newParticipant: RaceParticipantWithLiveData =
                    lastMessage.data as RaceParticipantWithLiveData;

                const raceIndex = stateRaces.findIndex((race) => {
                    return race.raceId === newParticipant.raceId;
                });

                if (raceIndex !== -1) {
                    const race = stateRaces[raceIndex];

                    const index = race.participants?.findIndex(
                        (participant) =>
                            participant.user === newParticipant.user,
                    );

                    const newRace = { ...race };

                    if (index !== undefined && index > -1) {
                        (newRace.participants as RaceParticipantWithLiveData[])[
                            index
                        ] = newParticipant;
                    } else {
                        newRace.participants?.push(newParticipant);
                    }

                    newRace.participants = sortRaceParticipants(newRace);

                    newRaces[raceIndex] = newRace;
                }
            }
            if (lastMessage.type === "raceUpdate") {
                const index = stateRaces.findIndex(
                    (race) => race.raceId === lastMessage.data.raceId,
                );

                if (index !== -1) {
                    const participants = newRaces[index].participants;
                    newRaces[index] = lastMessage.data as Race;
                    newRaces[index].participants = participants;
                } else {
                    newRaces.unshift(lastMessage.data);
                }
            }
            setStateRaces(newRaces);
        }
    }, [lastMessage]);

    return stateRaces;
};
