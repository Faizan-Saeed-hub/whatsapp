import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { getDemoMessages, getDemoGroups, deleteDemoMessage, deleteDemoGroup } from '../helpers/demoChat';
import Shield from './icons/Shield';
import Search from './icons/Search';
import Trash from './icons/Trash';
import Message from './Message';

const AdminPanel = ({ session, isDemo, groups = [], onSelectGroup, onDeleteGroupSuccess }) => {
    const [allMessages, setAllMessages] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterMediaType, setFilterMediaType] = useState('all'); // 'all' | 'text' | 'image' | 'audio' | 'file'
    const [activeTab, setActiveTab] = useState('stream'); // 'stream' | 'groups'

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

    useEffect(() => {
        fetchAllMessages();

        if (isDemo) {
            if (typeof BroadcastChannel !== 'undefined') {
                const channel = new BroadcastChannel('wp_demo_channel');
                channel.onmessage = (e) => {
                    if (e.data?.type === 'NEW_MESSAGE') {
                        setAllMessages(prev => [e.data.payload || e.data.message, ...prev]);
                    } else if (e.data?.type === 'DELETE_MESSAGE') {
                        setAllMessages(prev => prev.filter(m => m.id !== e.data.payload.id));
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

    // Calculate metrics
    const totalMessages = allMessages.length;
    const totalPhotos = allMessages.filter(m => m.media_type === 'image').length;
    const totalAudio = allMessages.filter(m => m.media_type === 'audio').length;
    const totalFiles = allMessages.filter(m => m.media_type === 'file').length;
    const uniqueUsers = Array.from(new Set(allMessages.map(m => m.email).filter(Boolean))).length;

    // Filter messages for search and media type
    const filteredMessages = allMessages.filter(m => {
        const matchesMedia = filterMediaType === 'all' || m.media_type === filterMediaType;
        const matchesSearch = 
            (m.content && m.content.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (m.email && m.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (m.file_name && m.file_name.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesMedia && matchesSearch;
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
                    <span className="stat-num">{uniqueUsers}</span>
                    <span className="stat-label">Active Users</span>
                </div>
                <div className="stat-card highlight">
                    <span className="stat-num">{totalPhotos} 📸 / {totalAudio} 🎙️ / {totalFiles} 📎</span>
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
                            {['all', 'text', 'image', 'audio', 'file'].map(type => (
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

            {/* Manage Groups View */}
            {activeTab === 'groups' && (
                <div className="admin-groups-table-container">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Group Name</th>
                                <th>Description</th>
                                <th>Created By</th>
                                <th>Created Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groups.map(group => (
                                <tr key={group.id}>
                                    <td>
                                        <strong>{group.name}</strong>
                                    </td>
                                    <td>{group.description || '—'}</td>
                                    <td>{group.created_by}</td>
                                    <td>{new Date(group.created_at).toLocaleString()}</td>
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
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdminPanel;
