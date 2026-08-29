// Generates a consistent 6-digit user tag from an email
export const generate6DigitId = (email) => {
    if (!email) return '100000';
    let hash = 0;
    const cleanEmail = email.toLowerCase().trim();
    for (let i = 0; i < cleanEmail.length; i++) {
        hash = (hash << 5) - hash + cleanEmail.charCodeAt(i);
        hash |= 0;
    }
    const positive = Math.abs(hash);
    const sixDigit = (positive % 900000) + 100000;
    return String(sixDigit);
};

export const formatUserTag = (tag) => {
    if (!tag) return '#000000';
    return `#${tag.replace('#', '')}`;
};
