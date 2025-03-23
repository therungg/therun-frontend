import { EditEventInput } from "../../../types/events.types";
import { uploadEventImage } from "~app/events/actions/upload-event-image";
import sanitizeHtml from "sanitize-html";

export const formInputToEventInput = async (eventInput: FormData) => {
    const input = {
        organizerId: parseInt(eventInput.get("organizer") as string) as number,
        startsAt: new Date(eventInput.get("startsAt") as string),
        endsAt: new Date(eventInput.get("endsAt") as string),
        name: eventInput.get("name") as string,
        type: eventInput.get("type") as string,
        location: eventInput.get("location") as string,
        bluesky: eventInput.get("bluesky") as string,
        discord: eventInput.get("discord") as string,
        language: eventInput.get("language") as string,
        shortDescription: eventInput.get("shortDescription") as string,
        description: sanitizeHtml(eventInput.get("description") as string),
        url: eventInput.get("url") as string,
        tier: parseInt(eventInput.get("tier") as string) as number,
        isOffline: eventInput.get("isOffline") === "on",
    } as EditEventInput;

    const file = eventInput.get("image") as File;

    if (file.size > 0) {
        input.imageUrl = await uploadEventImage(
            file,
            input.name + "." + file.type.split("/")[1],
        );
    }

    return input;
};
