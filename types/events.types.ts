import { events } from "~src/db/schema";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type Event = InferSelectModel<typeof events>;
export type CreateEventInput = InferInsertModel<typeof events>;
export type EditEventInput = Omit<CreateEventInput, "createdBy">;
