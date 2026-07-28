import { redirect } from 'next/navigation';

interface Props {
    params: Promise<{ game: string }>;
}

export default async function RedirectToCategoryIndex({ params }: Props) {
    const { game } = await params;
    // Used to land on the Game tab's groups section; categories now have a
    // real index of their own.
    redirect(`/games-v2/${game}/manage?pane=categories`);
}
