import { useState, useEffect } from 'react';
import Search from './icons/Search';
import Plus from './icons/Plus';
import UserPlus from './icons/UserPlus';
import Shield from './icons/Shield';
import Dots from './icons/Dots';
import Copy from './icons/Copy';
import Check from './icons/Check';
import Lock from './icons/Lock';
import Trash from './icons/Trash';
import Pin from './icons/Pin';
import Moon from './icons/Moon';
import { getAvatarN } from '../helpers/getAvatarN';
import { generate6DigitId, formatUserTag } from '../helpers/userIdHelper';
import CreateGroupModal from './CreateGroupModal';
import NewPrivateChatModal from './NewPrivateChatModal';
import ProfileDrawer from './ProfileDrawer';

const Sidebar = ({ 
    groups = [], 
    activeGroupId, 
    unreadCounts = {},
    pinnedGroupIds = [],
    onTogglePinChat,
    onSelectGroup, 
    session, 
    userProfile,
    onUpdateProfile,
    isDemo, 
    isAdmin, 
    showAdminView, 
    onToggleAdminView,
    onLogout,
    onGroupCreated,
    onStartDirectChat,
    onDeleteChat,
    onClearChat,
    onToggleTheme,
    isDarkMode,
    typingGroupMap = {},
    allKnownUsers = []
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isPrivateModalOpen, setIsPrivateModalOpen] = useState(false);
    const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [copiedId, setCopiedId] = useState(false);
    const [activeItemMenuId, setActiveItemMenuId] = useState(null);

    const currentUserEmail = session?.user?.email || 'User';
    const displayName = userProfile?.username || (currentUserEmail.includes('@') ? currentUserEmail.split('@')[0] : currentUserEmail);
    const my6DigitId = userProfile?.user_tag || generate6DigitId(currentUserEmail);

    const avatarSrc = userProfile?.avatar_url || `/avatar/avatar-${userProfile?.avatar_num || getAvatarN(currentUserEmail)}.jpg`;

    useEffect(() => {
        const handleClickOutside = () => setActiveItemMenuId(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const handleCopyId = () => {
        navigator.clipboard.writeText(my6DigitId);
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
    };

    // Sort: pinned chats at top, then by created_at
    const sortedGroups = [...groups].sort((a, b) => {
        const aPinned = pinnedGroupIds.includes(a.id);
        const bPinned = pinnedGroupIds.includes(b.id);
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

    const filteredGroups = sortedGroups.filter(g => {
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
        
        const isSelf = group.participant1?.toLowerCase() === currentUserEmail.toLowerCase() &&
                       group.participant2?.toLowerCase() === currentUserEmail.toLowerCase();
        if (isSelf) {
            return { name: `You (Message yourself)`, email: currentUserEmail, tag: my6DigitId, isSelf: true };
        }

        const otherUser = group.participant1?.toLowerCase() === currentUserEmail.toLowerCase() 
            ? group.participant2 
            : group.participant1;
        const name = otherUser?.includes('@') ? otherUser.split('@')[0] : otherUser || 'User';
        const tag = generate6DigitId(otherUser);
        return { name: `@${name}`, email: otherUser, tag, isSelf: false };
    };

    const handleDeleteChatClick = (e, group) => {
        e.stopPropagation();
        setActiveItemMenuId(null);
        if (window.confirm(`Are you sure you want to delete "${group.name}" and all its messages?`)) {
            if (onDeleteChat) onDeleteChat(group);
        }
    };

    const handleClearChatClick = (e, group) => {
        e.stopPropagation();
        setActiveItemMenuId(null);
        if (window.confirm(`Are you sure you want to clear all messages in "${group.name}"?`)) {
            if (onClearChat) onClearChat(group);
        }
    };

    const handlePinClick = (e, group) => {
        e.stopPropagation();
        setActiveItemMenuId(null);
        if (onTogglePinChat) onTogglePinChat(group.id);
    };

    return (
        <aside className="sidebar">
            {/* Sidebar User Header */}
            <div className="sidebar-header">
                <div className="user-profile clickable-profile" onClick={() => setIsProfileDrawerOpen(true)} title="Click to view & edit your profile">
                    <img 
                        src={avatarSrc} 
                        alt="My Avatar" 
                        className="user-avatar"
                    />
                    <div className="user-info">
                        <div className="user-name-row">
                            <span className="user-name">@{displayName}</span>
                            {isAdmin && <span className="admin-badge"><Shield /> Admin</span>}
                        </div>
                        {/* 6-Digit ID Chip */}
                        <div 
                            className="user-tag-chip" 
                            onClick={(e) => { e.stopPropagation(); handleCopyId(); }} 
                            title="Click to copy your 6-digit ID"
                        >
                            <span className="tag-label">ID:</span>
                            <strong className="tag-number">{formatUserTag(my6DigitId)}</strong>
                            <button type="button" className="tag-copy-icon">
                                {copiedId ? <Check /> : <Copy />}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="sidebar-actions">
                    <button 
                        type="button" 
                        className="icon-btn" 
                        onClick={() => setIsPrivateModalOpen(true)}
                        title="New 1-on-1 Direct Chat (Search by 6-Digit ID)"
                    >
                        <UserPlus />
                    </button>
                    <button 
                        type="button" 
                        className="icon-btn" 
                        onClick={() => setIsCreateModalOpen(true)}
                        title="New Group Chat"
                    >
                        <Plus />
                    </button>
                    {isAdmin && (
                        <button 
                            type="button" 
                            className={`icon-btn ${showAdminView ? 'active' : ''}`} 
                            onClick={onToggleAdminView}
                            title={showAdminView ? "Back to Chat" : "Admin Live Monitor"}
                        >
                            <Shield />
                        </button>
                    )}
                    <div className="menu-container">
                        <button 
                            type="button" 
                            className="icon-btn" 
                            onClick={() => setMenuOpen(!menuOpen)}
                            title="Menu"
                        >
                            <Dots />
                        </button>
                        {menuOpen && (
                            <div className="dropdown-menu">
                                <button type="button" onClick={() => { setIsProfileDrawerOpen(true); setMenuOpen(false); }}>
                                    My Profile
                                </button>
                                <button type="button" onClick={() => { onStartDirectChat(currentUserEmail, my6DigitId); setMenuOpen(false); }}>
                                    Message Yourself (Notes)
                                </button>
                                <button type="button" onClick={() => { onToggleTheme(); setMenuOpen(false); }}>
                                    <Moon /> {isDarkMode ? "Light theme" : "Dark theme"}
                                </button>
                                <button type="button" onClick={() => { setIsPrivateModalOpen(true); setMenuOpen(false); }}>
                                    Direct Message (by ID)
                                </button>
                                <button type="button" onClick={() => { setIsCreateModalOpen(true); setMenuOpen(false); }}>
                                    Create New Group
                                </button>
                                <button type="button" onClick={() => { onToggleAdminView(); setMenuOpen(false); }}>
                                    {showAdminView ? "Chat View" : "Admin Monitor"}
                                </button>
                                <button type="button" className="logout-action" onClick={onLogout}>
                                    Log Out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="sidebar-search">
                <div className="search-input-wrapper">
                    <Search />
                    <input 
                        type="text" 
                        placeholder="Search or start new chat..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Groups & Direct Chats List */}
            <div className="groups-list">
                {filteredGroups.length === 0 ? (
                    <div className="no-groups">
                        <p>No chats found</p>
                        <span>Click the user icon to message by 6-digit ID or + to create a group</span>
                    </div>
                ) : (
                    filteredGroups.map(group => {
                        const isActive = !showAdminView && String(activeGroupId) === String(group.id);
                        const isPinned = pinnedGroupIds.includes(group.id);
                        const isTyping = Boolean(typingGroupMap[group.id]);
                        const directInfo = getDirectChatDetails(group);
                        const title = directInfo ? directInfo.name : group.name;
                        const avatarLetter = getGroupInitials(title);
                        const unread = unreadCounts[group.id] || 0;
                        const isMenuThisItem = Boolean(activeItemMenuId && String(activeItemMenuId) === String(group.id));

                        return (
                            <div 
                                key={group.id} 
                                className={`group-item ${isActive ? 'active' : ''} ${group.is_direct ? 'direct-chat-item' : ''} ${isPinned ? 'pinned-item' : ''} ${isMenuThisItem ? 'has-active-menu' : ''}`}
                                onClick={() => onSelectGroup(group)}
                            >
                                <div className={`group-avatar ${group.is_direct ? 'direct-avatar' : ''}`}>
                                    {directInfo ? (
                                        <img 
                                            src={directInfo.isSelf ? avatarSrc : `/avatar/avatar-${getAvatarN(directInfo.email)}.jpg`} 
                                            alt={title} 
                                            className="direct-item-avatar-img"
                                        />
                                    ) : (
                                        avatarLetter
                                    )}
                                </div>
                                <div className="group-details">
                                    <div className="group-details-top">
                                        <div className="group-title-row">
                                            <h4 className="group-name">{title}</h4>
                                            {group.is_direct && (
                                                <span className={`direct-badge ${directInfo?.isSelf ? 'self-badge' : ''}`} title={directInfo?.isSelf ? "Personal Notes" : "Private 1-on-1 Chat"}>
                                                    <Lock /> {directInfo?.isSelf ? "You" : "Direct"}
                                                </span>
                                            )}
                                        </div>
                                        <div className="group-time-row">
                                            <span className="group-time">
                                                {group.created_at ? new Date(group.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                                            </span>
                                            <div className="group-indicators-row">
                                                {isPinned && <span className="pinned-badge" title="Pinned chat"><Pin /></span>}
                                                {unread > 0 && (
                                                    <span className="unread-badge-pill" title={`${unread} unread messages`}>
                                                        {unread > 99 ? '99+' : unread}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="group-bottom-row">
                                        {isTyping ? (
                                            <p className="group-desc typing-text">typing...</p>
                                        ) : (
                                            <p className="group-desc">
                                                {directInfo ? (directInfo.isSelf ? "Message yourself • Personal notes" : `Private chat • ${formatUserTag(directInfo.tag)}`) : (group.description || 'Tap to chat...')}
                                            </p>
                                        )}
                                        
                                        {/* 3-Dots Menu Trigger on each chat */}
                                        <div className="chat-item-menu-container" onClick={e => e.stopPropagation()}>
                                            <button 
                                                type="button" 
                                                className="chat-item-dots-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveItemMenuId(isMenuThisItem ? null : group.id);
                                                }}
                                                title="Chat options"
                                            >
                                                <Dots />
                                            </button>

                                            {isMenuThisItem && (
                                                <div className="chat-item-dropdown">
                                                    <button type="button" onClick={(e) => handlePinClick(e, group)}>
                                                        <Pin /> {isPinned ? "Unpin chat" : "Pin chat"}
                                                    </button>
                                                    <button type="button" onClick={(e) => handleClearChatClick(e, group)}>
                                                        Clear messages
                                                    </button>
                                                    <button type="button" className="danger-action" onClick={(e) => handleDeleteChatClick(e, group)}>
                                                        <Trash /> Delete chat
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Profile Drawer Component */}
            <ProfileDrawer 
                isOpen={isProfileDrawerOpen}
                onClose={() => setIsProfileDrawerOpen(false)}
                profile={userProfile || {
                    email: currentUserEmail,
                    username: displayName,
                    user_tag: my6DigitId,
                    about: 'Hey there! I am using WhatsApp.',
                    avatar_num: getAvatarN(currentUserEmail)
                }}
                onUpdateProfile={onUpdateProfile}
            />

            {/* Create Group Modal */}
            <CreateGroupModal 
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onGroupCreated={onGroupCreated}
                currentUserEmail={currentUserEmail}
                isDemo={isDemo}
            />

            {/* New Private Chat Modal */}
            <NewPrivateChatModal 
                isOpen={isPrivateModalOpen}
                onClose={() => setIsPrivateModalOpen(false)}
                currentUserEmail={currentUserEmail}
                onStartDirectChat={onStartDirectChat}
                isDemo={isDemo}
                allKnownUsers={allKnownUsers}
            />
        </aside>
    );
};

export default Sidebar;
