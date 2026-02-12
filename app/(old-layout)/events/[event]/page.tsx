'use server';

import type { Metadata } from 'next';
import { JsonLd } from '~src/components/json-ld';
import { getEventById } from '~src/lib/events';
import { buildEventJsonLd } from '~src/utils/json-ld';
import { ViewEvent } from './view-event';

interface PageProps {
    params: Promise<{ event: number }>;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
    const params = await props.params;
    const event = await getEventById(params.event);

    if (event.isDeleted) {
        return { title: 'Event not found' };
    }

    const title = `${event.name} - therun.gg`;
    const description = event.shortDescription || `${event.name} on therun.gg`;

    return {
        title,
        description,
        openGraph: {
            title: event.name,
            description,
            ...(event.imageUrl ? { images: [event.imageUrl] } : {}),
            type: 'website',
            url: `https://therun.gg/events/${event.slug}`,
        },
        twitter: {
            card: event.imageUrl ? 'summary_large_image' : 'summary',
            title: event.name,
            description,
            ...(event.imageUrl ? { images: [event.imageUrl] } : {}),
        },
    };
}

export default async function ViewEventPage(props: PageProps) {
    const params = await props.params;
    const eventId = params.event;

    const event = await getEventById(eventId);

    if (event.isDeleted) {
        return <div>Event not found</div>;
    }

    return (
        <>
            <JsonLd data={buildEventJsonLd(event)} />
            <ViewEvent event={event} />
        </>
    );
}
