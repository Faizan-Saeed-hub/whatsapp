import Close from './icons/Close';
import Download from './icons/Download';
import ExternalLink from './icons/ExternalLink';
import FileText from './icons/FileText';
import VideoIcon from './icons/VideoIcon';
import { downloadMediaFile } from '../helpers/fileDownloader';

const FileViewerModal = ({ isOpen, onClose, file }) => {
    if (!isOpen || !file) return null;

    const { url, name, size, type } = file;
    const isImage = type === 'image' || (name && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name));
    const isVideo = type === 'video' || (name && /\.(mp4|webm|ogg|mov|mkv)$/i.test(name));
    const isPdf = type === 'pdf' || (name && /\.pdf$/i.test(name)) || (url && url.startsWith('data:application/pdf'));

    const handleDownload = () => {
        if (!url) return;
        const targetName = name || (isVideo ? 'video.mp4' : isImage ? 'photo.jpg' : isPdf ? 'document.pdf' : 'download');
        downloadMediaFile(url, targetName);
    };

    const handleOpenInNewTab = () => {
        if (!url) return;
        if (url.startsWith('data:')) {
            fetch(url)
                .then(res => res.blob())
                .then(blob => {
                    const blobUrl = URL.createObjectURL(blob);
                    window.open(blobUrl, '_blank');
                })
                .catch(() => {
                    window.open(url, '_blank');
                });
        } else {
            window.open(url, '_blank');
        }
    };

    return (
        <div className="file-viewer-backdrop" onClick={onClose}>
            <div className={`file-viewer-card ${isPdf ? 'pdf-viewer-mode' : ''}`} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="file-viewer-header">
                    <div className="file-header-title">
                        {isImage ? <FileText /> : isVideo ? <VideoIcon /> : <FileText />}
                        <div>
                            <h4>{name || (isVideo ? 'Video' : isPdf ? 'PDF Document' : 'Attachment')}</h4>
                            {size && <span>{size}</span>}
                        </div>
                    </div>
                    <div className="file-header-actions">
                        <button 
                            type="button" 
                            className="viewer-action-btn" 
                            onClick={handleOpenInNewTab}
                            title="Open in new tab"
                        >
                            <ExternalLink />
                            <span>Open</span>
                        </button>
                        <button 
                            type="button" 
                            className="viewer-action-btn primary" 
                            onClick={handleDownload}
                            title="Download file"
                        >
                            <Download />
                            <span>Download</span>
                        </button>
                        <button 
                            type="button" 
                            className="viewer-close-btn" 
                            onClick={onClose}
                            title="Close"
                        >
                            <Close />
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="file-viewer-body">
                    {isImage && (
                        <div className="file-image-preview">
                            <img src={url} alt={name || 'Preview'} />
                        </div>
                    )}

                    {isVideo && (
                        <div className="file-video-preview">
                            <video 
                                src={url} 
                                controls 
                                autoPlay 
                                style={{ maxWidth: '100%', maxHeight: '72vh', borderRadius: 8 }}
                            >
                                Your browser does not support HTML5 video playback.
                            </video>
                        </div>
                    )}

                    {isPdf && (
                        <div className="file-pdf-preview" style={{ width: '100%', height: '550px' }}>
                            <iframe 
                                src={url} 
                                title={name || "PDF Document"} 
                                style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8, background: '#ffffff' }}
                            />
                        </div>
                    )}

                    {!isImage && !isVideo && !isPdf && (
                        <div className="file-generic-preview">
                            <div className="large-file-icon">
                                <FileText />
                            </div>
                            <p className="generic-file-name">{name || 'Document'}</p>
                            <p className="generic-file-size">{size || ''}</p>
                            <p className="generic-file-hint">Click Open or Download above to view full document</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FileViewerModal;
