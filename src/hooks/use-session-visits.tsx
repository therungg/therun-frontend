import { useCallback, useRef } from 'react';
import { useNavigationEvent } from './use-navigation-event';

export const useSessionVisits = () => {
    const STORAGE_KEY = 'session_visits';
    const previousUrlRef = useRef('');

    const trackRouteVisit = useCallback(() => {
        const previousUrl = previousUrlRef.current;
        const currentUrl = window.location.pathname;

        if (currentUrl !== previousUrl) {
            previousUrlRef.current = currentUrl;
            const visits = window.sessionStorage.getItem(STORAGE_KEY);
            const sessionVisits = visits ? JSON.parse(visits) : {};
            sessionVisits[currentUrl] = (sessionVisits[currentUrl] || 0) + 1;
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sessionVisits));
        }
    }, []);

    useNavigationEvent(trackRouteVisit);
};
