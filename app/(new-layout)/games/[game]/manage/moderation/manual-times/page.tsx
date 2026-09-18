import { redirect } from 'next/navigation';

export default async function Page({
    params,
}: {
    params: Promise<{ game: string }>;
}) {
    const { game } = await params;
    redirect(`/games/${game}/manage?pane=attention`);
}
