import { redirect } from 'next/navigation';
import { getLayoutPreference } from '~src/actions/layout-preference.action';
import FrontPage from './frontpage';

export default async function Page({
    searchParams,
}: {
    searchParams: Promise<{ statsUser?: string }>;
}) {
    const layoutPreference = await getLayoutPreference();

    // If user prefers old layout, redirect them to the classic homepage
    if (layoutPreference === 'old') {
        redirect('/');
    }

    const params = await searchParams;

    return <FrontPage statsUser={params.statsUser} />;
}
