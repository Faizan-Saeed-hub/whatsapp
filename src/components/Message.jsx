import { useState, useRef, useEffect } from 'react';
import { formatDate } from "../helpers/formatDate";
import AudioPlayer from "./AudioPlayer";
import FileText from "./icons/FileText";
import Download from "./icons/Download";
import Star from "./icons/Star";
import ChevronDown from "./icons/ChevronDown";
import DoubleCheck from "./icons/DoubleCheck";
import FileViewerModal from "./FileViewerModal";
import { ReactionBar, ReactionBadgeList } from "./MessageReactions";
import { generate6DigitId, formatUserTag } from "../helpers/userIdHelper";
import { getAvatarN } from "../helpers/getAvatarN";
import { downloadMediaFile } from "../helpers/fileDownloader";

const USER_COLORS = [
    "#2563eb", "#7c3aed", "#db2777", "#ea580c", 
    "#16a34a", "#0891b2", "#9333ea", "#d97706"
];

const getUserColor = (email) => {
    if (!email) return USER_COLORS[0];
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
        hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % USER_COLORS.length;
    return USER_COLORS[index];
};

const Message = ({ 
    id,
    message, 
    date, 
    email, 
    media_type = 'text', 
    media_url, 
    file_name, 
    file_size,
    is_deleted = false,
    reply_to = null,
    reactions = {},
    isStarred = false,
    seen_by = [],
    seen_at = null,
    currentUserEmail,
    isAdmin = false,
    onToggleReaction,
    onSelectMessage,
    isSelected = false,
    isHighlighted = false,
    groupName = null,
    userProfilesMap = {}
}) => {
    const [viewerOpen, setViewerOpen] = useState(false);
    const [userPopoverOpen, setUserPopoverOpen] = useState(false);
    const [reactionsOpen, setReactionsOpen] = useState(false);

    const pressTimerRef = useRef(null);
    const cardRef = useRef(null);

    const isMe = currentUserEmail && email ? currentUserEmail.trim().toLowerCase() === email.trim().toLowerCase() : false;
    const senderProfile = userProfilesMap[email?.toLowerCase()];
    const senderName = senderProfile?.username || (email ? (email.includes('@') ? email.split('@')[0] : email) : "anonymous");
    const nameColor = getUserColor(email);
    const senderTag = senderProfile?.user_tag || generate6DigitId(email);

    const avatarSrc = senderProfile?.avatar_url || `/avatar/avatar-${senderProfile?.avatar_num || getAvatarN(email)}.jpg`;

    const isMessageDeleted = Boolean(
        is_deleted || 
        message === '🚫 This message was deleted' || 
        message === '🚫 You deleted this message'
    );

    const isPdf = media_type === 'pdf' || (file_name && /\.pdf$/i.test(file_name)) || (media_url && media_url.startsWith('data:application/pdf'));

    // Close reaction bar when clicking/touching outside
    useEffect(() => {
        if (!reactionsOpen) return;

        const handleOutsideClick = (e) => {
            if (cardRef.current && !cardRef.current.contains(e.target)) {
                setReactionsOpen(false);
            }
        };

        window.addEventListener('click', handleOutsideClick);
        window.addEventListener('touchstart', handleOutsideClick);
        return () => {
            window.removeEventListener('click', handleOutsideClick);
            window.removeEventListener('touchstart', handleOutsideClick);
        };
    }, [reactionsOpen]);

    // Seen by someone other than the sender
    const isSeenByOther = Array.isArray(seen_by) && seen_by.some(e => e && e.toLowerCase() !== email?.toLowerCase());

    // Long-Press (Hold for 400ms) handlers
    const handleTouchStart = () => {
        if (isMessageDeleted) return;
        pressTimerRef.current = setTimeout(() => {
            setReactionsOpen(true);
            if (onSelectMessage) {
                onSelectMessage({ id, content: message, date, email, media_type, media_url, file_name, file_size, isMe });
            }
        }, 400);
    };

    const handleTouchEnd = () => {
        if (pressTimerRef.current) {
            clearTimeout(pressTimerRef.current);
            pressTimerRef.current = null;
        }
    };

    const handleOpenFile = (e) => {
        e.stopPropagation();
        if (!isMessageDeleted) {
            setViewerOpen(true);
        }
    };

    const handleDownloadDirect = (e) => {
        e.stopPropagation();
        if (!media_url) return;
        const targetName = file_name || (media_type === 'video' ? 'video.mp4' : media_type === 'image' ? 'photo.jpg' : isPdf ? 'document.pdf' : 'download');
        downloadMediaFile(media_url, targetName);
    };

    const handleUserClick = (e) => {
        e.stopPropagation();
        if (!isMe && !isMessageDeleted) {
            setUserPopoverOpen(!userPopoverOpen);
        }
    };

    const handleCardClick = (e) => {
        if (isMessageDeleted) return;
        setReactionsOpen(!reactionsOpen);
        if (onSelectMessage) {
            onSelectMessage({ id, content: message, date, email, media_type, media_url, file_name, file_size, isMe });
        }
    };

    const handleToggleChevron = (e) => {
        e.stopPropagation();
        setReactionsOpen(!reactionsOpen);
        if (onSelectMessage) {
            onSelectMessage({ id, content: message, date, email, media_type, media_url, file_name, file_size, isMe });
        }
    };

    return (
        <div 
            ref={cardRef}
            className={`card-wrapper ${isMe ? "me" : "other"} ${isHighlighted ? "search-highlight" : ""} ${isSelected ? "selected-msg-row" : ""}`}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleTouchStart}
            onMouseUp={handleTouchEnd}
            onMouseLeave={handleTouchEnd}
            onClick={handleCardClick}
        >
            {/* Sender DP Profile Picture shown on the side (left) of incoming messages */}
            {!isMe && (
                <div className="message-side-avatar-container" onClick={handleUserClick} title={`@${senderName}`}>
                    <img 
                        src={avatarSrc} 
                        alt={senderName} 
                        className="message-side-avatar"
                    />
                </div>
            )}

            <div className={`card ${isMe ? "me" : ""} ${isMessageDeleted ? "deleted-card" : ""}`}>
                {/* Floating Top Reaction Bar */}
                {!isMessageDeleted && reactionsOpen && (
                    <div className="floating-top-reaction-bar" onClick={e => e.stopPropagation()}>
                        <ReactionBar 
                            onSelectReaction={(emoji) => {
                                if (onToggleReaction) onToggleReaction(id, emoji);
                                setReactionsOpen(false);
                            }} 
                        />
                    </div>
                )}

                {/* Header row */}
                <div className="card-top-row">
                    {!isMe && !isMessageDeleted && (
                        <div className="sender-name-wrapper">
                            <span 
                                className="user-email clickable-user" 
                                style={{ color: nameColor }}
                                onClick={handleUserClick}
                                title={`Click to chat privately with @${senderName}`}
                            >
                                {senderName}
                            </span>

                            {/* User Quick Info Popover */}
                            {userPopoverOpen && (
                                <div className="user-quick-popover" onClick={e => e.stopPropagation()}>
                                    <div className="popover-user-row">
                                        <img 
                                            src={avatarSrc} 
                                            alt={senderName} 
                                            className="popover-avatar"
                                        />
                                        <div>
                                            <strong>@{senderName}</strong>
                                            <small>{formatUserTag(senderTag)}</small>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {groupName && !isMessageDeleted && (
                        <span className="group-tag">in {groupName}</span>
                    )}

                    {/* Downward Chevron */}
                    {!isMessageDeleted && (
                        <div className="card-menu-trigger-wrap" onClick={e => e.stopPropagation()}>
                            <button 
                                type="button" 
                                className="msg-chevron-btn" 
                                onClick={handleToggleChevron}
                                title="React & Options"
                            >
                                <ChevronDown />
                            </button>
                        </div>
                    )}
                </div>

                {/* Quoted Message Reply Box */}
                {reply_to && !isMessageDeleted && (
                    <div className="quoted-reply-box">
                        <span className="quoted-sender">@{reply_to.sender || 'User'}</span>
                        <p className="quoted-text">{reply_to.text || (reply_to.media_type ? `[${reply_to.media_type}]` : 'Message')}</p>
                    </div>
                )}

                {/* Deleted Notice */}
                {isMessageDeleted ? (
                    <div className="deleted-message-text">
                        <span className="deleted-icon">🚫</span>
                        <em>{isMe ? "You deleted this message" : "This message was deleted"}</em>
                    </div>
                ) : (
                    <>
                        {/* Photo / Image Media */}
                        {media_type === 'image' && media_url && (
                            <div className="message-image-container" onClick={handleOpenFile} title="Click to view full image">
                                <img 
                                    src={media_url} 
                                    alt={file_name || "Photo Attachment"} 
                                    className="message-image"
                                />
                                <button 
                                    type="button" 
                                    className="image-download-overlay-btn" 
                                    onClick={handleDownloadDirect}
                                    title="Download Photo"
                                >
                                    <Download />
                                </button>
                            </div>
                        )}

                        {/* Video Media (Inline Player + Fullscreen / Download support) */}
                        {media_type === 'video' && media_url && (
                            <div className="message-video-container" onClick={e => e.stopPropagation()}>
                                <video 
                                    src={media_url} 
                                    controls 
                                    className="message-video-player"
                                    preload="metadata"
                                >
                                    Your browser does not support video playback.
                                </video>
                                <div className="video-meta-bar">
                                    <span>{file_name || 'Video'}</span>
                                    <button 
                                        type="button" 
                                        className="inline-download-btn" 
                                        onClick={handleDownloadDirect}
                                        title="Download Video"
                                    >
                                        <Download />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Audio / Voice Note */}
                        {media_type === 'audio' && media_url && (
                            <AudioPlayer src={media_url} />
                        )}

                        {/* PDF / Document Attachment */}
                        {(media_type === 'file' || media_type === 'pdf') && (
                            <div 
                                className={`message-file-card clickable ${isPdf ? 'pdf-card' : ''}`} 
                                onClick={handleOpenFile}
                                title={isPdf ? "Click to open & read PDF preview" : "Click to open attachment"}
                            >
                                <div className={`file-icon-box ${isPdf ? 'pdf-icon-box' : ''}`}>
                                    <FileText />
                                </div>
                                <div className="file-info">
                                    <span className="file-name">
                                        {file_name || (isPdf ? "Document.pdf" : "Attachment")}
                                    </span>
                                    <div className="file-sub-row">
                                        {file_size && <span className="file-size">{file_size}</span>}
                                        <span className="file-action-hint">• {isPdf ? 'Preview PDF' : 'Open'}</span>
                                    </div>
                                </div>
                                <button 
                                    type="button" 
                                    className="inline-file-download-btn" 
                                    onClick={handleDownloadDirect}
                                    title="Download File"
                                >
                                    <Download />
                                </button>
                            </div>
                        )}

                        {/* Text content */}
                        {message && (
                            <p className="message-text">{message}</p>
                        )}
                    </>
                )}

                {/* Footer: Timestamp, Star indicator, Delivery & Seen Ticks */}
                <div className="message-footer-row">
                    {isStarred && !isMessageDeleted && <span className="starred-badge"><Star filled={true} /></span>}
                    <span className="message-timestamp">{formatDate(date)}</span>
                    {isMe && !isMessageDeleted && (
                        <span className={`message-ticks ${isSeenByOther ? 'seen-blue' : ''}`} title={isSeenByOther ? "Read / Seen" : "Delivered"}>
                            <DoubleCheck read={isSeenByOther} />
                        </span>
                    )}
                </div>

                {/* Reaction Badges Container */}
                {!isMessageDeleted && (
                    <ReactionBadgeList 
                        reactions={reactions} 
                        currentUserEmail={currentUserEmail}
                        onToggleReaction={(emoji) => onToggleReaction && onToggleReaction(id, emoji)}
                    />
                )}
            </div>

            {/* Universal File Viewer Modal */}
            <FileViewerModal 
                isOpen={viewerOpen}
                onClose={() => setViewerOpen(false)}
                file={{
                    url: media_url,
                    name: file_name || (media_type === 'video' ? 'video.mp4' : media_type === 'image' ? 'photo.jpg' : isPdf ? 'document.pdf' : 'attachment'),
                    size: file_size,
                    type: media_type
                }}
            />
        </div>
    );
};

export default Message;
