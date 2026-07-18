import { redirect } from 'next/navigation';

interface Props {
    params: Promise<{ game: string }>;
}

export default async function ModerationPage({ params }: Props) {
    const { game } = await params;
    redirect(`/games-v2/${game}/manage?pane=attention`);
}
