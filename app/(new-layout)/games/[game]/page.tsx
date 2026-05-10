import type { Metadata } from 'next';
import { RedirectType, redirect } from 'next/navigation';
import buildMetadata, { getGameImage } from '~src/utils/metadata';
import { safeDecodeURI } from '~src/utils/uri';

export const maxDuration = 60;

interface PageProps {
    params: Promise<{ game: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function GamePage({ params, searchParams }: PageProps) {
    const { game } = await params;
    const sp = await searchParams;
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
        if (typeof v === 'string') qs.set(k, v);
        else if (Array.isArray(v)) {
            for (const item of v) {
                if (typeof item === 'string') qs.append(k, item);
            }
        }
    }
    const target = qs.toString()
        ? `/games-v2/${game}?${qs.toString()}`
        : `/games-v2/${game}`;
    redirect(target, RedirectType.replace);
}

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const { game } = await params;
    if (!game) return buildMetadata();
    const display = safeDecodeURI(game);
    return buildMetadata({
        title: `Statistics for ${display}`,
        description: `View statistics for ${display}, including categories, top runners, total run time, and more!`,
        images: await getGameImage(display),
    });
}
