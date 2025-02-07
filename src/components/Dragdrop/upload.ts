import useSWRMutation, { MutationFetcher } from "swr/mutation";
import { safeEncodeURI } from "~src/utils/uri";

interface UseUploadMutationParams {
    file: File;
    contents: string;
    sessionId: string;
}
export const useUploadMutation = () => {
    return useSWRMutation(process.env.NEXT_PUBLIC_UPLOAD_URL, uploadFile);
};

export const uploadFile: MutationFetcher<
    void,
    string,
    UseUploadMutationParams
> = async (url, { arg: { contents, file, sessionId } }) => {
    if (file.size > 50 * 1000 * 1000) {
        throw new Error("File must be smaller than 50MB");
    }

    const uploadUrl = `${url}?filename=${safeEncodeURI(
        file.name,
    )}&sessionId=${sessionId}`;
    const presignedUrl = await fetch(uploadUrl, {
        method: "GET",
        headers: {
            "Content-Disposition": "attachment",
        },
    });

    const result = await presignedUrl.json();

    const postUrl = result.url;

    await fetch(postUrl, {
        method: "PUT",
        body: contents,
        headers: {
            "Content-Disposition": "attachment",
        },
    });
};
