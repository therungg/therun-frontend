import { Run, RunSession } from '~src/common/types';

export const prepareSessions = (
    runs: Run[],
    gametime: boolean,
): RunSession[] => {
    const sessions: RunSession[] = [];

    runs.forEach((run) => {
        const currentSessions =
            gametime && run.gameTimeData?.sessions
                ? run.gameTimeData.sessions
                : run.sessions;
        currentSessions.forEach((session) => {
            session.gameTime = gametime && !!run.gameTimeData?.sessions;
            session.game = `${run.game} - ${run.run}`;
            sessions.push(session);
        });
    });

    sessions.sort((a, b) => (a.endedAt > b.endedAt ? -1 : 1));

    return sessions.slice(0, 10);
};
