export const downloadMediaFile = async (url, fileName = 'download') => {
    if (!url) return;
    try {
        let blobUrl = url;
        let needRevoke = false;

        if (url.startsWith('data:')) {
            const res = await fetch(url);
            const blob = await res.blob();
            blobUrl = URL.createObjectURL(blob);
            needRevoke = true;
        }

        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            if (document.body.contains(a)) {
                document.body.removeChild(a);
            }
            if (needRevoke) URL.revokeObjectURL(blobUrl);
        }, 250);
    } catch (err) {
        console.error("Download error:", err);
        window.open(url, '_blank');
    }
};
