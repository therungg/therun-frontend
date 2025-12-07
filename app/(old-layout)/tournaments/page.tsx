import { AllTournaments } from '~app/(old-layout)/tournaments/all-tournaments';
import { getTournaments } from '~src/components/tournament/getTournaments';
import { Tournament } from '~src/components/tournament/tournament-info';
import buildMetadata from '~src/utils/metadata';

export default async function TournamentsPage() {
    const tournaments: Tournament[] = await getTournaments();

    tournaments.sort((a, b) => {
        return (
            new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        );
    });

    const now = new Date().toISOString();

    const finishedTournaments = tournaments.filter(
        (tournament) => tournament.endDate < now,
    );
    const ongoingTournaments = tournaments.filter(
        (tournament) => tournament.startDate < now && tournament.endDate > now,
    );
    const upcomingTournaments = tournaments.filter(
        (tournament) => tournament.startDate > now,
    );

    return (
        <AllTournaments
            finishedTournaments={finishedTournaments}
            ongoingTournaments={ongoingTournaments}
            upcomingTournaments={upcomingTournaments}
        />
    );
}

export const metadata = buildMetadata({
    title: 'Tournaments',
    description:
        'Itching for some tournament action? Browse a selection of tournaments whose participants use The Run for an unprecedented look at tournament statistics!',
});
