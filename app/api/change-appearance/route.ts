import { GET as baseGet } from "../route";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
    return baseGet(request, "change-appearance");
}
