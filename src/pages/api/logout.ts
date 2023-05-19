export const handler = async (req, res) => {
    res.setHeader(
        "Set-Cookie",
        "jwt=deleted; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    );
    res.send({});
};
