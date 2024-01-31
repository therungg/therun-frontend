import { PaginatedRaces } from "~app/races/races.types";
import {
    Breadcrumb,
    BreadcrumbItem,
} from "~src/components/breadcrumbs/breadcrumb";
import { FinishedRaceTable } from "~app/races/finished/finished-races-table";

export const FinishedRaces = ({
    paginatedRaces,
}: {
    paginatedRaces: PaginatedRaces;
}) => {
    const breadcrumbs: BreadcrumbItem[] = [
        { content: "Races", href: "/races" },
        { content: "Finished Races" },
    ];
    return (
        <div>
            <Breadcrumb breadcrumbs={breadcrumbs} />
            <FinishedRaceTable paginatedRaces={paginatedRaces} />
        </div>
    );
};
