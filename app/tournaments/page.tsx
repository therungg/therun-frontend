import { Tournament } from "~src/components/tournament/tournament-info";
import { getTournaments } from "~src/components/tournament/getTournaments";
import { AllTournaments } from "~app/tournaments/all-tournaments";

export default async function TournamentsPage() {
    const tournaments: Tournament[] = await getTournaments();

    const now = new Date().toISOString();

    const finishedTournaments = tournaments.filter(
        (tournament) => tournament.endDate < now
    );
    const ongoingTournaments = tournaments.filter(
        (tournament) => tournament.startDate < now && tournament.endDate > now
    );
    const upcomingTournaments = tournaments.filter(
        (tournament) => tournament.startDate > now
    );

    return (
        <AllTournaments
            finishedTournaments={finishedTournaments}
            ongoingTournaments={ongoingTournaments}
            upcomingTournaments={upcomingTournaments}
        />
    );
}
