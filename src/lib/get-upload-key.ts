"use server";

export const getUploadKey = async (user: string) => {
    const url = `${process.env.NEXT_PUBLIC_DATA_URL}/users/uploadKey/${user}`;

    return (await fetch(url)).json();
};
