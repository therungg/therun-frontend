import { redirect } from 'next/navigation';
import { getLayoutPreference } from '~src/actions/layout-preference.action';
import FrontPage from './frontpage';

export default async function Page() {
    const layoutPreference = await getLayoutPreference();

    // If user prefers old layout, redirect them to the classic homepage
    if (layoutPreference === 'old') {
        redirect('/');
    }

    return <FrontPage />;
}
