export const getPronounsFromString = (
    pronouns: string | undefined,
): [string, string, string] => {
    if (!pronouns) return ['they', 'them', 'their'];

    const firstPronoun = pronouns.split('/')[0].toLowerCase();

    switch (firstPronoun) {
        case 'he':
            return ['he', 'him', 'his'];
        case 'she':
            return ['she', 'her', 'her'];
        case 'they':
            return ['they', 'them', 'their'];
        case 'it':
            return ['it', 'its', 'its'];
    }

    return ['they', 'them', 'their'];
};
