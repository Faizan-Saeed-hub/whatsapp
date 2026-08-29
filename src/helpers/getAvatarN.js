export const getAvatarN = (email) => {
    if (!email || typeof email !== 'string') return '0';
    const clean = email.trim();
    if (!clean.length) return '0';
    const charCode = clean.charCodeAt(0);
    const index = Math.abs(charCode - 65) % 10;
    return String(index);
};