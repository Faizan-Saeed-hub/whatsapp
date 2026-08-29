import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { getDemoMessages, getDemoGroups, deleteDemoMessage, deleteDemoGroup, getAllDemoUsers, removeDemoUser } from '../helpers/demoChat';
import Shield from './icons/Shield';
import Search from './icons/Search';
import Trash from './icons/Trash';
import UserPlus from './icons/UserPlus';
import Message from './Message';
import { getAvatarN } from '../helpers/getAvatarN';
import { generate6DigitId } from '../helpers/userIdHelper';

const AdminPanel = ({ 
    session, 
    isDemo, 
    groups = [], 
    onSelectGroup, 
    onDeleteGroupSuccess,
    onStartDirectChat,
    allKnownUsers = [],
    onRemoveUserSuccess
}) => {
    const [allMessages, setAllMessages] = useState([]);
    const [userList, setUserList] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [filterMediaType, setFilterMediaType] = useState('all'); // 'all' | 'text' | 'image' | 'video' | 'audio' | 'file'
    const [activeTab, setActiveTab] = useState('stream'); // 'stream' | 'groups' | 'users'
    const [expandedGroupId, setExpandedGroupId] = useState(null);

    const adminEmail = 'faizan0687@gmail.com';

    const fetchAllMessages = async () => {
        if (isDemo) {
            setAllMessages(getDemoMessages());
            return;
        }

        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) setAllMessages(data);
        } catch (err) {
            console.error("Error fetching all messages for admin:", err);
        }
    };

    const fetchAllUsers = async () => {
        if (isDemo) {
            const demoUsers = getAllDemoUsers();
            setUserList(demoUsers);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*');

            if (error) {
                console.warn("Profiles fetch fallback:", error);
                const demoUsers = getAllDemoUsers();
                setUserList(demoUsers);
            } else if (data && data.length > 0) {
                setUserList(data);
            } else {
                const demoUsers = getAllDemoUsers();
                setUserList(demoUsers);
            }
        } catch (err) {
            console.error("Error fetching users for admin:", err);
            setUserList(getAllDemoUsers());
        }
    };

    useEffect(() => {
        fetchAllMessages();
        fetchAllUsers();

        if (isDemo) {
            if (typeof BroadcastChannel !== 'undefined') {
                const channel = new BroadcastChannel('wp_demo_channel');
                channel.onmessage = (e) => {
                    if (e.data?.type === 'NEW_MESSAGE') {
                        setAllMessages(prev => [e.data.payload || e.data.message, ...prev]);
                    } else if (e.data?.type === 'DELETE_MESSAGE') {
                        setAllMessages(prev => prev.filter(m => m.id !== e.data.payload.id));
                    } else if (e.data?.type === 'USER_REMOVED') {
                        setUserList(prev => prev.filter(u => u.email?.toLowerCase() !== e.data.payload.email?.toLowerCase()));
                    }
                };
                return () => channel.close();
            }
            return;
        }

        const channel = supabase
            .channel('admin-global-monitor')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
                setAllMessages(prev => [payload.new, ...prev]);
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (payload) => {
                setAllMessages(prev => prev.filter(m => m.id !== payload.old.id));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isDemo]);

    const handleDeleteMessage = async (msgId) => {
        if (isDemo) {
            deleteDemoMessage(msgId);
            setAllMessages(prev => prev.filter(m => m.id !== msgId));
            return;
        }

        try {
            const { error } = await supabase.from('messages').delete().eq('id', msgId);
            if (error) throw error;
            setAllMessages(prev => prev.filter(m => m.id !== msgId));
        } catch (err) {
            console.error("Admin delete message error:", err);
            alert("Failed to delete message: " + err.message);
        }
    };

    const handleDeleteGroup = async (groupId) => {
        if (!window.confirm("Are you sure you want to delete this entire group and all its messages?")) return;

        if (isDemo) {
            deleteDemoGroup(groupId);
            if (onDeleteGroupSuccess) onDeleteGroupSuccess(groupId);
            return;
        }

        try {
            const { error } = await supabase.from('groups').delete().eq('id', groupId);
            if (error) throw error;
            if (onDeleteGroupSuccess) onDeleteGroupSuccess(groupId);
        } catch (err) {
            console.error("Admin delete group error:", err);
            alert("Failed to delete group: " + err.message);
        }
    };

    // Remove User System (Admin Only)
    const handleRemoveUser = async (userEmail, userName) => {
        if (!userEmail) return;
        const cleanEmail = userEmail.toLowerCase();

        if (cleanEmail === adminEmail.toLowerCase()) {
            alert("The primary Admin account cannot be removed!");
            return;
        }

        if (!window.confirm(`Are you sure you want to permanently remove user "${userName || userEmail}" (${userEmail}) from the entire system?`)) {
            return;
        }

        // Remove from local and demo storage
        removeDemoUser(cleanEmail);
        setUserList(prev => prev.filter(u => u.email?.toLowerCase() !== cleanEmail));
        setAllMessages(prev => prev.filter(m => m.email?.toLowerCase() !== cleanEmail));

        // Remove from Supabase database
        try {
            await supabase.from('profiles').delete().eq('email', cleanEmail);
            await supabase.from('messages').delete().eq('email', cleanEmail);
        } catch (err) {
            console.warn("Supabase user removal error:", err);
        }

        if (onRemoveUserSuccess) {
            onRemoveUserSuccess(cleanEmail);
        }

        alert(`User ${cleanEmail} has been successfully removed.`);
    };

    // Remove member from group
    const handleRemoveMemberFromGroup = async (groupId, memberEmail) => {
        if (!window.confirm(`Remove ${memberEmail} from this group?`)) return;

        const targetGroup = groups.find(g => String(g.id) === String(groupId));
        if (!targetGroup) return;

        const updatedMembers = Array.isArray(targetGroup.members)
            ? targetGroup.members.filter(m => m.toLowerCase() !== memberEmail.toLowerCase())
            : [];

        try {
            if (!isDemo) {
                await supabase.from('groups').update({ members: updatedMembers }).eq('id', groupId);
            }
            targetGroup.members = updatedMembers;
            alert(`${memberEmail} removed from group.`);
        } catch (err) {
            console.error("Error removing member from group:", err);
        }
    };

    // Calculate metrics
    const totalMessages = allMessages.length;
    const totalPhotos = allMessages.filter(m => m.media_type === 'image').length;
    const totalVideos = allMessages.filter(m => m.media_type === 'video').length;
    const totalAudio = allMessages.filter(m => m.media_type === 'audio').length;
    const totalFiles = allMessages.filter(m => m.media_type === 'file' || m.media_type === 'pdf').length;
    
    // Unique registered users list
    const combinedUsers = [...userList];
    allMessages.forEach(m => {
        if (m.email && !combinedUsers.some(u => u.email?.toLowerCase() === m.email.toLowerCase())) {
            combinedUsers.push({
                email: m.email,
                username: m.email.split('@')[0],
                user_tag: generate6DigitId(m.email),
                avatar_num: String(getAvatarN(m.email))
            });
        }
    });

    const uniqueUsersCount = combinedUsers.length;

    // Filter messages for search and media type
    const filteredMessages = allMessages.filter(m => {
        const matchesMedia = filterMediaType === 'all' || m.media_type === filterMediaType;
        const matchesSearch = 
            (m.content && m.content.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (m.email && m.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (m.file_name && m.file_name.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesMedia && matchesSearch;
    });

    // Filter users
    const filteredUsers = combinedUsers.filter(u => {
        const q = userSearchTerm.toLowerCase();
        return (
            (u.username && u.username.toLowerCase().includes(q)) ||
            (u.email && u.email.toLowerCase().includes(q)) ||
            (u.user_tag && u.user_tag.toLowerCase().includes(q))
        );
    });

    const getGroupName = (groupId) => {
        const found = groups.find(g => String(g.id) === String(groupId));
        return found ? found.name : `Group #${groupId}`;
    };

    return (
        <div className="admin-panel">
            {/* Header */}
            <div className="admin-header">
                <div className="admin-title">
                    <Shield />
                    <div>
                        <h2>Admin Chat Monitor & Management</h2>
                        <p>Real-time oversight across all groups, users, and media</p>
                    </div>
                </div>
                <div className="admin-nav-tabs">
                    <button 
                        type="button" 
                        className={`tab ${activeTab === 'stream' ? 'active' : ''}`}
                        onClick={() => setActiveTab('stream')}
                    >
                        Live Chat Stream
                    </button>
                    <button 
                        type="button" 
                        className={`tab ${activeTab === 'groups' ? 'active' : ''}`}
                        onClick={() => setActiveTab('groups')}
                    >
                        Manage Groups ({groups.length})
                    </button>
                    <button 
                        type="button" 
                        className={`tab ${activeTab === 'users' ? 'active' : ''}`}
                        onClick={() => setActiveTab('users')}
                    >
                        Manage Users ({uniqueUsersCount})
                    </button>
                </div>
            </div>

            {/* Metrics Bar */}
            <div className="admin-stats-grid">
                <div className="stat-card">
                    <span className="stat-num">{groups.length}</span>
                    <span className="stat-label">Total Groups</span>
                </div>
                <div className="stat-card">
                    <span className="stat-num">{totalMessages}</span>
                    <span className="stat-label">Total Messages</span>
                </div>
                <div className="stat-card">
                    <span className="stat-num">{uniqueUsersCount}</span>
                    <span className="stat-label">Active Users</span>
                </div>
                <div className="stat-card highlight">
                    <span className="stat-num">{totalPhotos} 📸 / {totalVideos} 🎬 / {totalAudio} 🎙️ / {totalFiles} 📄</span>
                    <span className="stat-label">Media Shared</span>
                </div>
            </div>

            {/* Live Message Stream View */}
            {activeTab === 'stream' && (
                <div className="admin-stream-container">
                    <div className="admin-filters-bar">
                        <div className="search-input-box">
                            <Search />
                            <input 
                                type="text" 
                                placeholder="Search by message, sender email, or file name..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="media-filter-buttons">
                            {['all', 'text', 'image', 'video', 'audio', 'file'].map(type => (
                                <button 
                                    key={type}
                                    type="button"
                                    className={`filter-btn ${filterMediaType === type ? 'active' : ''}`}
                                    onClick={() => setFilterMediaType(type)}
                                >
                                    {type.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="admin-messages-list">
                        {filteredMessages.length === 0 ? (
                            <div className="empty-admin-feed">
                                <p>No messages match your filter</p>
                            </div>
                        ) : (
                            filteredMessages.map(msg => (
                                <div key={msg.id} className="admin-message-row">
                                    <div className="admin-msg-meta">
                                        <button 
                                            type="button" 
                                            className="group-jump-btn"
                                            onClick={() => {
                                                const targetGroup = groups.find(g => String(g.id) === String(msg.group_id));
                                                if (targetGroup && onSelectGroup) onSelectGroup(targetGroup);
                                            }}
                                            title="Open this group"
                                        >
                                            Group: <strong>{getGroupName(msg.group_id)}</strong>
                                        </button>
                                        <span className="sender-tag">Sender: {msg.email}</span>
                                    </div>
                                    <Message 
                                        id={msg.id}
                                        message={msg.content}
                                        date={msg.created_at}
                                        email={msg.email}
                                        media_type={msg.media_type}
                                        media_url={msg.media_url}
                                        file_name={msg.file_name}
                                        file_size={msg.file_size}
                                        currentUserEmail={session?.user?.email}
                                        isAdmin={true}
                                        onDeleteMessage={handleDeleteMessage}
                                    />
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Manage Users Tab */}
            {activeTab === 'users' && (
                <div className="admin-users-container">
                    <div className="admin-filters-bar">
                        <div className="search-input-box">
                            <Search />
                            <input 
                                type="text" 
                                placeholder="Search user by name, email, or 6-digit ID..."
                                value={userSearchTerm}
                                onChange={e => setUserSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="admin-users-grid">
                        {filteredUsers.map(u => {
                            const isFaizanAdmin = u.email?.toLowerCase() === adminEmail.toLowerCase();
                            const userMsgCount = allMessages.filter(m => m.email?.toLowerCase() === u.email?.toLowerCase()).length;
                            const avatar = u.avatar_url || `/avatar/avatar-${u.avatar_num || getAvatarN(u.email)}.jpg`;

                            return (
                                <div key={u.email} className={`admin-user-card ${isFaizanAdmin ? 'is-admin-card' : ''}`}>
                                    <div className="user-card-header">
                                        <img src={avatar} alt={u.username} className="user-card-avatar" />
                                        <div className="user-card-info">
                                            <div className="user-card-name-row">
                                                <h4>{u.username || u.email?.split('@')[0]}</h4>
                                                {isFaizanAdmin ? (
                                                    <span className="badge-admin">👑 Admin</span>
                                                ) : (
                                                    <span className="badge-member">👤 Member</span>
                                                )}
                                            </div>
                                            <span className="user-card-email">{u.email}</span>
                                            <span className="user-card-tag">ID: <strong>#{u.user_tag || generate6DigitId(u.email)}</strong></span>
                                        </div>
                                    </div>

                                    <div className="user-card-stats">
                                        <span>💬 {userMsgCount} messages sent</span>
                                    </div>

                                    <div className="user-card-actions">
                                        <button 
                                            type="button" 
                                            className="btn-user-chat"
                                            onClick={() => onStartDirectChat && onStartDirectChat(u.email, u.user_tag || generate6DigitId(u.email))}
                                        >
                                            💬 Message
                                        </button>
                                        {!isFaizanAdmin && (
                                            <button 
                                                type="button" 
                                                className="btn-user-remove"
                                                onClick={() => handleRemoveUser(u.email, u.username)}
                                                title="Remove this user completely"
                                            >
                                                <Trash /> Remove User
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Manage Groups View */}
            {activeTab === 'groups' && (
                <div className="admin-groups-table-container">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Group Name</th>
                                <th>Description</th>
                                <th>Created By</th>
                                <th>Members</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groups.map(group => {
                                const members = Array.isArray(group.members) ? group.members : [];
                                const isExpanded = expandedGroupId === group.id;

                                return (
                                    <tr key={group.id}>
                                        <td>
                                            <strong>{group.name}</strong>
                                        </td>
                                        <td>{group.description || '—'}</td>
                                        <td>{group.created_by}</td>
                                        <td>
                                            <div className="group-members-summary">
                                                <span>{members.length} members</span>
                                                <button 
                                                    type="button" 
                                                    className="btn-view-members"
                                                    onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                                                >
                                                    {isExpanded ? 'Hide' : 'View'}
                                                </button>
                                            </div>
                                            {isExpanded && (
                                                <div className="group-members-list-popup">
                                                    {members.length === 0 ? (
                                                        <small>No members listed</small>
                                                    ) : (
                                                        members.map(m => (
                                                            <div key={m} className="member-item-row">
                                                                <span>{m}</span>
                                                                {m.toLowerCase() !== adminEmail.toLowerCase() && (
                                                                    <button 
                                                                        type="button" 
                                                                        className="btn-kick-member"
                                                                        onClick={() => handleRemoveMemberFromGroup(group.id, m)}
                                                                        title="Remove from group"
                                                                    >
                                                                        Remove
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <div className="table-actions">
                                                <button 
                                                    type="button" 
                                                    className="btn-open-group"
                                                    onClick={() => onSelectGroup(group)}
                                                >
                                                    Open Chat
                                                </button>
                                                <button 
                                                    type="button" 
                                                    className="btn-delete-group"
                                                    onClick={() => handleDeleteGroup(group.id)}
                                                    title="Delete Group"
                                                >
                                                    <Trash />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdminPanel;
