import { NextRequest } from "next/server";
import { afterLoginRedirect } from "~app/(old-layout)/api/after-login-redirect";

export async function GET(request: NextRequest) {
    return afterLoginRedirect(request, "change-appearance");
}
