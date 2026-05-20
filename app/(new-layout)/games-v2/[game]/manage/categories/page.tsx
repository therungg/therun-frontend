import { redirect } from 'next/navigation';

interface Props {
    params: Promise<{ game: string }>;
}

export default async function RedirectToManageGameTab({ params }: Props) {
    const { game } = await params;
    redirect(`/games-v2/${game}/manage?tab=game`);
}
