import { useState } from 'react';
import Close from './icons/Close';
import Star from './icons/Star';
import Image from './icons/Image';
import FileText from './icons/FileText';
import Lock from './icons/Lock';
import Shield from './icons/Shield';
import UserPlus from './icons/UserPlus';
import AddGroupMemberModal from './AddGroupMemberModal';
import { getAvatarN } from '../helpers/getAvatarN';
import { formatUserTag, generate6DigitId } from '../helpers/userIdHelper';

const ChatInfoDrawer = ({ 
    isOpen, 
    onClose, 
    activeGroup, 
    messages = [], 
    currentUserEmail, 
    starredIds = [], 
    onOpenMedia,
    userProfilesMap = {},
    onAddMemberToGroup,
    isDemo
}) => {
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'media' | 'starred'
    const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);

    if (!isOpen || !activeGroup) return null;

    const isDirect = activeGroup.is_direct;
    const otherEmail = isDirect 
        ? (activeGroup.participant1?.toLowerCase() === currentUserEmail?.toLowerCase() ? activeGroup.participant2 : activeGroup.participant1)
        : null;
    const isSelf = isDirect && activeGroup.participant1?.toLowerCase() === activeGroup.participant2?.toLowerCase();

    const otherProfile = otherEmail ? userProfilesMap[otherEmail.toLowerCase()] : null;
    const otherName = otherProfile?.username || (otherEmail ? (otherEmail.includes('@') ? otherEmail.split('@')[0] : otherEmail) : null);
    const otherTag = otherProfile?.user_tag || (otherEmail ? generate6DigitId(otherEmail) : null);

    const avatarSrc = isDirect
        ? (otherProfile?.avatar_url || `/avatar/avatar-${otherProfile?.avatar_num || getAvatarN(otherEmail)}.jpg`)
        : null;

    const mediaMessages = messages.filter(m => m.media_type === 'image' || m.media_type === 'file');
    const starredMessages = messages.filter(m => starredIds.includes(m.id));

    // Combine participants from group fields and messages
    const rawMembers = Array.from(new Set([
        activeGroup.created_by,
        activeGroup.participant1,
        activeGroup.participant2,
        ...(activeGroup.members || []),
        ...messages.map(m => m.email)
    ].filter(Boolean)));

    const groupMembers = rawMembers.map(email => {
        const prof = userProfilesMap[email.toLowerCase()];
        return {
            email,
            username: prof?.username || email.split('@')[0],
            tag: prof?.user_tag || generate6DigitId(email),
            avatarUrl: prof?.avatar_url || `/avatar/avatar-${prof?.avatar_num || getAvatarN(email)}.jpg`,
            isCreator: email.toLowerCase() === activeGroup.created_by?.toLowerCase()
        };
    });

    const handleMemberAdded = (newEmail) => {
        if (onAddMemberToGroup) {
            onAddMemberToGroup(activeGroup.id, newEmail);
        }
        setAddMemberModalOpen(false);
    };

    return (
        <aside className="chat-info-drawer">
            {/* Header */}
            <div className="info-drawer-header">
                <button type="button" className="info-close-btn" onClick={onClose}>
                    <Close />
                </button>
                <h4>{isDirect ? "Contact info" : "Group info"}</h4>
            </div>

            <div className="info-drawer-content">
                {/* Profile Card */}
                <div className="info-profile-card">
                    {isDirect ? (
                        <img 
                            src={avatarSrc} 
                            alt={otherName} 
                            className="info-large-avatar"
                        />
                    ) : (
                        <div className="info-group-avatar-large">
                            {activeGroup.name?.slice(0, 2).toUpperCase() || "GP"}
                        </div>
                    )}
                    <h3 className="info-name">
                        {isDirect ? (isSelf ? "You (Message yourself)" : `@${otherName}`) : activeGroup.name}
                    </h3>
                    <p className="info-sub">
                        {isDirect 
                            ? `${formatUserTag(otherTag)} • ${otherEmail}` 
                            : `${activeGroup.description || 'Community Group'}`}
                    </p>
                </div>

                {/* Tabs */}
                <div className="info-tabs-bar">
                    <button 
                        type="button" 
                        className={`info-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        Overview
                    </button>
                    <button 
                        type="button" 
                        className={`info-tab-btn ${activeTab === 'media' ? 'active' : ''}`}
                        onClick={() => setActiveTab('media')}
                    >
                        Media ({mediaMessages.length})
                    </button>
                    <button 
                        type="button" 
                        className={`info-tab-btn ${activeTab === 'starred' ? 'active' : ''}`}
                        onClick={() => setActiveTab('starred')}
                    >
                        Starred ({starredMessages.length})
                    </button>
                </div>

                {/* Tab: Overview */}
                {activeTab === 'overview' && (
                    <div className="info-section-content">
                        {/* Description / About */}
                        <div className="info-data-card">
                            <span className="info-label">{isDirect ? "About" : "Group Description"}</span>
                            <p className="info-desc-text">
                                {isDirect 
                                    ? (isSelf ? "Personal note-taking & storage" : (otherProfile?.about || "Hey there! I am using WhatsApp.")) 
                                    : (activeGroup.description || "No description")}
                            </p>
                        </div>

                        {/* Group Members List (if Group) */}
                        {!isDirect && (
                            <div className="info-data-card">
                                <div className="members-header-row">
                                    <span className="info-label">Members ({groupMembers.length})</span>
                                    <button 
                                        type="button" 
                                        className="add-member-btn" 
                                        onClick={() => setAddMemberModalOpen(true)}
                                    >
                                        <UserPlus /> Add member
                                    </button>
                                </div>
                                <div className="info-members-list">
                                    {groupMembers.map(member => (
                                        <div key={member.email} className="info-member-item">
                                            <img 
                                                src={member.avatarUrl} 
                                                alt={member.username} 
                                                className="info-member-avatar"
                                            />
                                            <div className="info-member-details">
                                                <span className="info-member-name">@{member.username}</span>
                                                <small>{member.email}</small>
                                            </div>
                                            {member.isCreator && (
                                                <span className="info-admin-tag">
                                                    <Shield /> Group Admin
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab: Media Gallery */}
                {activeTab === 'media' && (
                    <div className="info-media-grid">
                        {mediaMessages.length === 0 ? (
                            <div className="empty-drawer-state">
                                <Image />
                                <p>No shared media or docs yet</p>
                            </div>
                        ) : (
                            mediaMessages.map(item => (
                                <div 
                                    key={item.id} 
                                    className="media-thumb-card" 
                                    onClick={() => onOpenMedia && onOpenMedia(item)}
                                >
                                    {item.media_type === 'image' ? (
                                        <img src={item.media_url} alt="Shared media" />
                                    ) : (
                                        <div className="file-thumb-box">
                                            <FileText />
                                            <span>{item.file_name || 'File'}</span>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Tab: Starred Messages */}
                {activeTab === 'starred' && (
                    <div className="info-starred-list">
                        {starredMessages.length === 0 ? (
                            <div className="empty-drawer-state">
                                <Star filled={true} />
                                <p>No starred messages in this chat</p>
                            </div>
                        ) : (
                            starredMessages.map(msg => (
                                <div key={msg.id} className="starred-msg-item">
                                    <span className="starred-sender">@{msg.email?.split('@')[0]}</span>
                                    <p className="starred-text">{msg.content || (msg.media_type ? `[${msg.media_type}]` : 'Message')}</p>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Add Group Member Modal */}
            <AddGroupMemberModal 
                isOpen={addMemberModalOpen}
                onClose={() => setAddMemberModalOpen(false)}
                group={activeGroup}
                existingMembers={rawMembers}
                onMemberAdded={handleMemberAdded}
                isDemo={isDemo}
            />
        </aside>
    );
};

export default ChatInfoDrawer;
