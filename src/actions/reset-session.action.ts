"use server";
export const resetSession = async () => {
    if (typeof window !== "undefined") return;
    try {
        const { cookies } = await import("next/headers");
        cookies().delete("session_id");
    } catch (error) {
        console.error(error);
    }
};
