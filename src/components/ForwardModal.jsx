import { useState } from 'react';
import Close from './icons/Close';
import Search from './icons/Search';
import Forward from './icons/Forward';
import Lock from './icons/Lock';
import FileText from './icons/FileText';
import { getAvatarN } from '../helpers/getAvatarN';
import { generate6DigitId, formatUserTag } from '../helpers/userIdHelper';

const ForwardModal = ({ 
    isOpen, 
    onClose, 
    message, 
    groups = [], 
    currentUserEmail, 
    onForwardMessage 
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [forwardingId, setForwardingId] = useState(null);
    const [forwardSuccess, setForwardSuccess] = useState(false);

    if (!isOpen || !message) return null;

    const filteredGroups = groups.filter(g => {
        const term = searchTerm.toLowerCase();
        return (
            (g.name && g.name.toLowerCase().includes(term)) ||
            (g.description && g.description.toLowerCase().includes(term)) ||
            (g.participant1 && g.participant1.toLowerCase().includes(term)) ||
            (g.participant2 && g.participant2.toLowerCase().includes(term))
        );
    });

    const getGroupInitials = (name) => {
        if (!name) return 'GP';
        const clean = name.replace('@', '');
        const parts = clean.trim().split(' ');
        if (parts.length > 1) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return clean.slice(0, 2).toUpperCase();
    };

    const getDirectChatDetails = (group) => {
        if (!group.is_direct) return null;
        const otherUser = group.participant1?.toLowerCase() === currentUserEmail?.toLowerCase() 
            ? group.participant2 
            : group.participant1;
        const name = otherUser?.includes('@') ? otherUser.split('@')[0] : otherUser || 'User';
        const tag = generate6DigitId(otherUser);
        return { name: `@${name}`, email: otherUser, tag };
    };

    const handleSendForward = async (targetGroup) => {
        setForwardingId(targetGroup.id);
        if (onForwardMessage) {
            await onForwardMessage(message, targetGroup);
        }
        setForwardSuccess(true);
        setTimeout(() => {
            setForwardSuccess(false);
            setForwardingId(null);
            onClose();
        }, 800);
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content forward-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="forward-modal-title">
                        <Forward />
                        <h3>Forward Message to...</h3>
                    </div>
                    <button type="button" className="modal-close-btn" onClick={onClose}>
                        <Close />
                    </button>
                </div>

                {/* Preview of message being forwarded */}
                <div className="forward-preview-box">
                    <span className="preview-label">Forwarding:</span>
                    {message.media_type === 'image' && (
                        <div className="forward-media-snippet">
                            <img src={message.media_url} alt="Forward preview" />
                            <span>Photo {message.content ? `• ${message.content}` : ''}</span>
                        </div>
                    )}
                    {message.media_type === 'audio' && (
                        <div className="forward-media-snippet">
                            <span>🎙️ Voice Note</span>
                        </div>
                    )}
                    {message.media_type === 'file' && (
                        <div className="forward-media-snippet">
                            <FileText />
                            <span>{message.file_name || "Document"}</span>
                        </div>
                    )}
                    {(!message.media_type || message.media_type === 'text') && (
                        <p className="forward-text-snippet">{message.content || 'Message'}</p>
                    )}
                </div>

                {/* Search Bar */}
                <div className="search-input-wrapper modal-search">
                    <Search />
                    <input 
                        type="text" 
                        placeholder="Search chats or groups..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        autoFocus
                    />
                </div>

                {/* Chats destination list */}
                <div className="forward-destinations-list">
                    {filteredGroups.length === 0 ? (
                        <div className="search-empty-state">
                            <p>No chats found</p>
                        </div>
                    ) : (
                        filteredGroups.map(group => {
                            const directInfo = getDirectChatDetails(group);
                            const title = directInfo ? directInfo.name : group.name;
                            const avatarLetter = getGroupInitials(title);
                            const isSending = forwardingId === group.id;

                            return (
                                <div key={group.id} className="forward-dest-item">
                                    <div className={`group-avatar small ${group.is_direct ? 'direct-avatar' : ''}`}>
                                        {directInfo ? (
                                            <img 
                                                src={`/avatar/avatar-${getAvatarN(directInfo.email)}.jpg`} 
                                                alt={title} 
                                                className="direct-item-avatar-img"
                                            />
                                        ) : (
                                            avatarLetter
                                        )}
                                    </div>
                                    <div className="forward-dest-info">
                                        <div className="group-title-row">
                                            <span className="dest-name">{title}</span>
                                            {group.is_direct && (
                                                <span className="direct-badge">
                                                    <Lock /> Direct
                                                </span>
                                            )}
                                        </div>
                                        <small className="dest-desc">
                                            {directInfo ? formatUserTag(directInfo.tag) : (group.description || 'Group')}
                                        </small>
                                    </div>
                                    <button 
                                        type="button" 
                                        className={`btn-forward-send ${isSending ? 'sending' : ''}`}
                                        onClick={() => handleSendForward(group)}
                                        disabled={forwardingId !== null}
                                    >
                                        {isSending ? (forwardSuccess ? "Sent!" : "Sending...") : "Forward"}
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForwardModal;
