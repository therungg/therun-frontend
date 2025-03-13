import { CreateLogInput } from "../../types/logs.types";
import { db } from "~src/db";
import { logs } from "~src/db/schema";

export const insertLog = async (input: CreateLogInput) => {
    await db.insert(logs).values(input);
};
