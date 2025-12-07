import { EditEventInput, EventRestream } from "../../../../types/events.types";
import { uploadEventImage } from "~app/(old-layout)/events/actions/upload-event-image";
import sanitizeHtml from "sanitize-html";

export const formInputToEventInput = async (eventInput: FormData) => {
    const input = {
        name: eventInput.get("name") as string,
        slug: eventInput.get("slug") as string,
        type: eventInput.get("type") as string,
        tier: parseInt(eventInput.get("tier") as string) as number,

        isOffline: eventInput.get("isOffline") === "on",
        language: eventInput.get("language") as string,
        location: eventInput.get("location") as string,

        organizerId: parseInt(
            eventInput.get("organizerId") as string,
        ) as number,

        startsAt: new Date(eventInput.get("startsAt") as string),
        endsAt: new Date(eventInput.get("endsAt") as string),

        url: eventInput.get("url") as string,
        scheduleUrl: eventInput.get("scheduleUrl") as string,
        bluesky: eventInput.get("bluesky") as string,
        discord: eventInput.get("discord") as string,
        submissionsUrl: eventInput.get("submissionsUrl") as string,
        twitter: eventInput.get("twitter") as string,
        twitch: eventInput.get("twitch") as string,

        shortDescription: eventInput.get("shortDescription") as string,
        description: sanitizeHtml(eventInput.get("description") as string),

        isForCharity: eventInput.get("isForCharity") === "on",
        charityName: eventInput.get("charityName") as string,
        charityUrl: eventInput.get("charityUrl") as string,

        tags: eventInput.get("tags")
            ? (eventInput.get("tags") as string).split(",")
            : [],
    } as EditEventInput;

    const file = eventInput.get("image") as File;

    if (file.size > 0) {
        input.imageUrl = await uploadEventImage(
            file,
            input.name + "." + file.type.split("/")[1],
        );
    }

    if (file.size > 10 * 1024 * 1024) {
        throw new Error("Image File can be maximum 10MB");
    }

    input.restreams = [] as EventRestream[];

    for (let i = 0; i < 10; i++) {
        const url = eventInput.get(`restreams[${i}].url`) as string;
        if (url) {
            (input.restreams as EventRestream[]).push({
                language: eventInput.get(`restreams[${i}].language`) as string,
                url,
                organizer: eventInput.get(
                    `restreams[${i}].organizer`,
                ) as string,
            });
        }
    }

    return input;
};
