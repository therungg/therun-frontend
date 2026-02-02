import { FinishedRaceTable } from '~app/(old-layout)/races/finished/finished-races-table';
import { PaginatedRaces } from '~app/(old-layout)/races/races.types';
import {
    Breadcrumb,
    BreadcrumbItem,
} from '~src/components/breadcrumbs/breadcrumb';

export const FinishedRaces = ({
    paginatedRaces,
}: {
    paginatedRaces: PaginatedRaces;
}) => {
    const breadcrumbs: BreadcrumbItem[] = [
        { content: 'Races', href: '/races' },
        { content: 'Finished Races' },
    ];
    return (
        <div>
            <Breadcrumb breadcrumbs={breadcrumbs} />
            <h2>Finished Races</h2>
            <FinishedRaceTable paginatedRaces={paginatedRaces} />
        </div>
    );
};
