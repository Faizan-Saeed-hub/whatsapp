export const formatDate = (messageDate) => {
    if (!messageDate) return '';
    const date = new Date(messageDate);
    if (isNaN(date.getTime())) return '';
    const options = { 
        month: 'short', 
        day: 'numeric' 
    };
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    const time = `${h}:${m}`;

    const newDate = date.toLocaleDateString('en-US', options);
    return `${newDate} - ${time}`;
};