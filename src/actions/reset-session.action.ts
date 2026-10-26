'use server';
import { cookies } from 'next/headers';

export const resetSession = async () => {
    if (typeof window !== 'undefined') return;
    try {
        const cookieStore = await cookies();
        cookieStore.delete('session_id');
        cookieStore.delete('has_session');
    } catch (error) {
        console.error(error);
    }
};
