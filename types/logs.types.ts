import { InferInsertModel } from "drizzle-orm";
import { logs } from "~src/db/schema";

export type CreateLogInput = InferInsertModel<typeof logs>;
