import { Tournament } from "~src/components/tournament/tournament-info";

export interface AllTournamentsProps {
    finishedTournaments: Tournament[];
    ongoingTournaments: Tournament[];
    upcomingTournaments: Tournament[];
}
