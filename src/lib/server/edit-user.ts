"use server";
export const editUser = async (sessionId: string, data: string) => {
    const url = `${process.env.NEXT_PUBLIC_DATA_URL}/users/${sessionId}`;
    const res = await fetch(url, {
        method: "PUT",
        body: data,
    });

    return res.body;
};
