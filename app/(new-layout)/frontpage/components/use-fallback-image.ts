import { useTheme } from 'next-themes';

export const useFallbackImage = () => {
    const { resolvedTheme } = useTheme();
    return resolvedTheme === 'light'
        ? '/logo_light_theme_no_text_transparent.png'
        : '/logo_dark_theme_no_text_transparent.png';
};
