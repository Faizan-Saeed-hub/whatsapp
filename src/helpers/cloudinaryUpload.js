const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'vqbfbti0';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'whatsapp_preset';

/**
 * Uploads a file or audio Blob directly to Cloudinary
 * Falls back to base64 Data URL if Cloudinary credentials are not configured or request fails.
 * 
 * @param {File|Blob} file 
 * @param {'image'|'video'|'audio'|'file'|'pdf'} mediaType 
 * @param {(progress: number) => void} [onProgress]
 * @returns {Promise<{ url: string, sizeFormatted: string, fileName: string }>}
 */
export const uploadToCloudinary = async (file, mediaType = 'image', onProgress = null) => {
    if (!file) return null;

    const fileName = file.name || (mediaType === 'audio' ? 'voice_note.webm' : mediaType === 'video' ? 'video.mp4' : 'photo.jpg');
    const sizeFormatted = file.size ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : '1.2 MB';

    // Attempt direct unsigned upload to Cloudinary (cloud: vqbfbti0, preset: whatsapp_preset)
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', UPLOAD_PRESET);
        formData.append('cloud_name', CLOUD_NAME);

        const resourceType = mediaType === 'video' || mediaType === 'audio' ? 'video' : mediaType === 'image' ? 'image' : 'auto';
        const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;

        const response = await fetch(endpoint, {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            if (data?.secure_url) {
                return {
                    url: data.secure_url,
                    sizeFormatted: data.bytes ? `${(data.bytes / (1024 * 1024)).toFixed(2)} MB` : sizeFormatted,
                    fileName: data.original_filename || fileName
                };
            }
        } else {
            console.warn("Cloudinary upload response not OK:", await response.text());
        }
    } catch (err) {
        console.warn("Cloudinary upload network error, falling back:", err);
    }

    // Fallback: Read file as Base64 Data URL (guarantees chat always works seamlessly)
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            resolve({
                url: reader.result,
                sizeFormatted,
                fileName
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};
