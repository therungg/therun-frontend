'use server';

export const getApiKey = async (): Promise<string> => {
    const prodKey = process.env.PROD_API_KEY;
    const devKey = process.env.DEV_API_KEY || '';

    return prodKey ? prodKey : devKey;
};
