import { db } from '~src/db';
import { logs } from '~src/db/schema';
import { CreateLogInput } from '../../types/logs.types';

export const insertLog = async (input: CreateLogInput) => {
    await db.insert(logs).values(input);
};
