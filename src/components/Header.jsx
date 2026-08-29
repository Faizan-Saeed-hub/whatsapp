import { useState } from "react";
import Arrow from "./icons/Arrow";
import Dots from "./icons/Dots";
import Shield from "./icons/Shield";
import Lock from "./icons/Lock";
import Trash from "./icons/Trash";
import Search from "./icons/Search";
import Moon from "./icons/Moon";
import Info from "./icons/Info";
import Reply from "./icons/Reply";
import Star from "./icons/Star";
import Copy from "./icons/Copy";
import Forward from "./icons/Forward";
import Close from "./icons/Close";
import { getAvatarN } from "../helpers/getAvatarN";
import { generate6DigitId, formatUserTag } from "../helpers/userIdHelper";

const Header = ({ 
    activeGroup, 
    onBackToSidebar, 
    isAdmin, 
    onToggleAdminView, 
    showAdminView, 
    onLogout,
    currentUserEmail,
    userProfile,
    onDeleteChat,
    onClearChat,
    onToggleSearch,
    onToggleChatInfo,
    onToggleTheme,
    isDarkMode,
    typingUser = null,
    selectedMessage = null,
    onClearSelectedMessage = null,
    onReplySelected = null,
    onStarSelected = null,
    onCopySelected = null,
    onForwardSelected = null,
    onDeleteSelected = null,
    onInfoSelected = null
}) => {
    const [open, setOpen] = useState(false);

    const isDirect = activeGroup?.is_direct;
    
    let otherEmail = null;
    let otherName = null;
    let otherTag = null;
    let isSelf = false;

    if (isDirect) {
        isSelf = activeGroup.participant1?.toLowerCase() === currentUserEmail?.toLowerCase() &&
                 activeGroup.participant2?.toLowerCase() === currentUserEmail?.toLowerCase();

        if (isSelf) {
            otherEmail = currentUserEmail;
            otherName = `${userProfile?.username || currentUserEmail.split('@')[0]} (You)`;
            otherTag = userProfile?.user_tag || generate6DigitId(currentUserEmail);
        } else {
            otherEmail = activeGroup.participant1?.toLowerCase() === currentUserEmail?.toLowerCase()
                ? activeGroup.participant2
                : activeGroup.participant1;
            otherName = otherEmail?.includes('@') ? otherEmail.split('@')[0] : otherEmail || 'User';
            otherTag = generate6DigitId(otherEmail);
        }
    }

    const getGroupInitials = (name) => {
        if (!name) return 'GP';
        const clean = name.replace('@', '');
        const parts = clean.trim().split(' ');
        if (parts.length > 1) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return clean.slice(0, 2).toUpperCase();
    };

    const avatarSrc = isSelf 
        ? (userProfile?.avatar_url || `/avatar/avatar-${userProfile?.avatar_num || getAvatarN(currentUserEmail)}.jpg`)
        : `/avatar/avatar-${getAvatarN(otherEmail)}.jpg`;

    const handleDeleteChat = () => {
        setOpen(false);
        if (window.confirm(`Are you sure you want to delete "${activeGroup?.name}" and all its messages?`)) {
            if (onDeleteChat) onDeleteChat(activeGroup);
        }
    };

    const handleClearChat = () => {
        setOpen(false);
        if (window.confirm(`Are you sure you want to clear all messages in "${activeGroup?.name}"?`)) {
            if (onClearChat) onClearChat(activeGroup);
        }
    };

    return ( 
        <header className="chat-header">
            {/* Left Info Area or Selected Message Indicator */}
            {selectedMessage ? (
                <div className="chat-header-left selected-msg-mode">
                    <button 
                        type="button" 
                        className="header-icon-btn close-selection-btn" 
                        onClick={onClearSelectedMessage}
                        title="Cancel selection"
                    >
                        <Close />
                    </button>
                    <span className="selected-count-label">1 message selected</span>
                </div>
            ) : (
                <div className="chat-header-left" onClick={onToggleChatInfo} title="Click to view Contact/Group Info">
                    {/* Mobile Back Button */}
                    <button 
                        type="button" 
                        className="mobile-back-btn" 
                        onClick={(e) => { e.stopPropagation(); onBackToSidebar(); }}
                        title="Back to all chats"
                    >
                        <Arrow />
                    </button>

                    {/* Avatar */}
                    {isDirect ? (
                        <img 
                            src={avatarSrc} 
                            alt={otherName} 
                            className="chat-direct-avatar-img"
                        />
                    ) : (
                        <div className="chat-group-avatar">
                            {getGroupInitials(activeGroup?.name || "Chat")}
                        </div>
                    )}

                    {/* Info */}
                    <div className="chat-group-info">
                        <div className="header-title-row">
                            <h3 className="chat-group-title">
                                {isDirect ? (isSelf ? otherName : `@${otherName}`) : (activeGroup?.name || "Select a Chat")}
                            </h3>
                            {isDirect && (
                                <span className={`header-tag-badge ${isSelf ? 'self-tag-badge' : ''}`}>
                                    <Lock /> {isSelf ? "Personal Notes" : formatUserTag(otherTag)}
                                </span>
                            )}
                        </div>

                        {/* Subtitle / Live Typing Status */}
                        {typingUser ? (
                            <p className="chat-group-subtitle typing-active">
                                <em>@{typingUser} is typing...</em>
                            </p>
                        ) : (
                            <p className="chat-group-subtitle">
                                {isDirect 
                                    ? (isSelf ? "Message yourself • Save notes, photos, and files" : "online") 
                                    : (activeGroup?.description || "Tap to view group info")}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Right Action Icons */}
            <div className="chat-header-right">
                {/* When a message is selected, show action options in upper bar BEFORE Search */}
                {selectedMessage && (
                    <div className="header-msg-actions-toolbar">
                        <button 
                            type="button" 
                            className="header-action-btn" 
                            onClick={() => onReplySelected && onReplySelected(selectedMessage)}
                            title="Reply"
                        >
                            <Reply />
                        </button>
                        <button 
                            type="button" 
                            className="header-action-btn" 
                            onClick={() => onInfoSelected && onInfoSelected(selectedMessage)}
                            title="Message info"
                        >
                            <Info />
                        </button>
                        <button 
                            type="button" 
                            className="header-action-btn" 
                            onClick={() => onStarSelected && onStarSelected(selectedMessage.id)}
                            title="Star / Unstar"
                        >
                            <Star />
                        </button>
                        {selectedMessage.content && (
                            <button 
                                type="button" 
                                className="header-action-btn" 
                                onClick={() => onCopySelected && onCopySelected(selectedMessage.content)}
                                title="Copy text"
                            >
                                <Copy />
                            </button>
                        )}
                        <button 
                            type="button" 
                            className="header-action-btn" 
                            onClick={() => onForwardSelected && onForwardSelected(selectedMessage)}
                            title="Forward"
                        >
                            <Forward />
                        </button>
                        <button 
                            type="button" 
                            className="header-action-btn danger" 
                            onClick={() => onDeleteSelected && onDeleteSelected(selectedMessage.id)}
                            title="Delete message"
                        >
                            <Trash />
                        </button>
                    </div>
                )}

                {/* 1. Info Button (Placed BEFORE Search) */}
                {!selectedMessage && (
                    <button 
                        type="button" 
                        className="header-icon-btn" 
                        onClick={onToggleChatInfo}
                        title={isDirect ? "Contact info" : "Group info"}
                    >
                        <Info />
                    </button>
                )}

                {/* 2. Search In Chat */}
                <button 
                    type="button" 
                    className="header-icon-btn" 
                    onClick={onToggleSearch}
                    title="Search in this chat"
                >
                    <Search />
                </button>

                {isAdmin && (
                    <button 
                        type="button" 
                        className={`admin-toggle-btn ${showAdminView ? 'active' : ''}`}
                        onClick={onToggleAdminView}
                        title="Admin Monitor"
                    >
                        <Shield />
                        <span>Admin</span>
                    </button>
                )}

                {/* 3. 3-Dots Menu Button */}
                <div className="header-menu-wrap" onClick={e => e.stopPropagation()}>
                    <button 
                        type="button" 
                        className="header-icon-btn header-dots-btn"
                        onClick={() => setOpen(!open)}
                        title="More options"
                    >
                        <Dots />
                    </button>

                    {open && (
                        <div className="dropdown-menu">
                            <button type="button" onClick={() => { setOpen(false); onToggleTheme(); }}>
                                <Moon /> {isDarkMode ? 'Light theme' : 'Dark theme'}
                            </button>
                            <button type="button" onClick={() => { setOpen(false); onToggleChatInfo(); }}>
                                <Info /> {isDirect ? 'Contact info' : 'Group info'}
                            </button>
                            <button type="button" onClick={handleClearChat}>
                                Clear messages
                            </button>
                            <button type="button" className="danger-action" onClick={handleDeleteChat}>
                                <Trash /> Delete chat
                            </button>
                            <button type="button" className="logout-action" onClick={() => { setOpen(false); onLogout(); }}>
                                Log out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;