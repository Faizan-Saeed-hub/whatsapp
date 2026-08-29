import Close from './icons/Close';
import DoubleCheck from './icons/DoubleCheck';
import SingleCheck from './icons/SingleCheck';
import { formatDate } from '../helpers/formatDate';
import { getAvatarN } from '../helpers/getAvatarN';

const formatDetailedTime = (dateStr) => {
    if (!dateStr) return "Just now";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Just now";
    const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    return isToday ? `Today at ${time}` : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${time}`;
};

const MessageInfoModal = ({ 
    isOpen, 
    onClose, 
    message, 
    currentUserEmail, 
    userProfilesMap = {} 
}) => {
    if (!isOpen || !message) return null;

    const seenByList = Array.isArray(message.seen_by) 
        ? message.seen_by.filter(e => e && e.toLowerCase() !== message.email?.toLowerCase())
        : [];

    const isRead = seenByList.length > 0;
    const sentTime = formatDetailedTime(message.created_at);
    const readTime = message.seen_at ? formatDetailedTime(message.seen_at) : (isRead ? sentTime : null);
    const deliveredTime = sentTime;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content message-info-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Message info</h3>
                    <button type="button" className="modal-close-btn" onClick={onClose}>
                        <Close />
                    </button>
                </div>

                {/* Message Bubble Preview */}
                <div className="msg-info-preview-box">
                    <div className="card me info-preview-card">
                        <p className="message-text">{message.content || (message.media_type ? `[${message.media_type}]` : 'Message')}</p>
                        <div className="message-footer-row">
                            <span className="message-timestamp">{formatDate(message.created_at)}</span>
                            <span className="message-ticks">
                                <DoubleCheck read={isRead} />
                            </span>
                        </div>
                    </div>
                </div>

                {/* Receipts Section */}
                <div className="msg-info-receipts-list">
                    {/* Read Section */}
                    <div className="receipt-row">
                        <div className="receipt-status-icon read-icon">
                            <DoubleCheck read={true} />
                        </div>
                        <div className="receipt-details">
                            <div className="receipt-title-row">
                                <strong>Read</strong>
                                <span className="receipt-time">{isRead ? readTime : "—"}</span>
                            </div>
                            {isRead ? (
                                <div className="readers-avatars-list">
                                    {seenByList.map(email => {
                                        const prof = userProfilesMap[email.toLowerCase()];
                                        const name = prof?.username || email.split('@')[0];
                                        const avatar = prof?.avatar_url || `/avatar/avatar-${prof?.avatar_num || getAvatarN(email)}.jpg`;
                                        return (
                                            <div key={email} className="reader-chip" title={email}>
                                                <img src={avatar} alt={name} />
                                                <span>@{name}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <small className="receipt-sub">Not seen yet</small>
                            )}
                        </div>
                    </div>

                    {/* Delivered Section */}
                    <div className="receipt-row">
                        <div className="receipt-status-icon delivered-icon">
                            <DoubleCheck read={false} />
                        </div>
                        <div className="receipt-details">
                            <div className="receipt-title-row">
                                <strong>Delivered</strong>
                                <span className="receipt-time">{deliveredTime}</span>
                            </div>
                            <small className="receipt-sub">Delivered to recipient</small>
                        </div>
                    </div>

                    {/* Sent Section */}
                    <div className="receipt-row">
                        <div className="receipt-status-icon sent-icon">
                            <SingleCheck />
                        </div>
                        <div className="receipt-details">
                            <div className="receipt-title-row">
                                <strong>Sent</strong>
                                <span className="receipt-time">{sentTime}</span>
                            </div>
                            <small className="receipt-sub">Sent to server</small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MessageInfoModal;
