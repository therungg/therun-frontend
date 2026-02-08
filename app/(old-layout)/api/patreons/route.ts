import { apiResponse } from '../response';
import { getAllPatrons } from './get-all-patrons.action';

export async function GET() {
    const result = await getAllPatrons();
    return apiResponse({
        body: result,
    });
}
