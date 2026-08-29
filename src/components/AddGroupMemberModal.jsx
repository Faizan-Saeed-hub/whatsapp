import { useState } from 'react';
import Close from './icons/Close';
import Search from './icons/Search';
import UserPlus from './icons/UserPlus';
import Check from './icons/Check';
import { getAvatarN } from '../helpers/getAvatarN';
import { generate6DigitId, formatUserTag } from '../helpers/userIdHelper';
import { supabase } from '../supabaseClient';

const PRESET_SAMPLE_USERS = [
    { email: 'faizan@gmail.com', username: 'Faizan', tag: '839201' },
    { email: 'alice@test.com', username: 'Alice', tag: '104928' },
    { email: 'bob@test.com', username: 'Bob', tag: '592810' },
    { email: 'charlie@test.com', username: 'Charlie', tag: '382910' },
    { email: 'diana@test.com', username: 'Diana', tag: '719203' }
];

const AddGroupMemberModal = ({ 
    isOpen, 
    onClose, 
    group, 
    existingMembers = [], 
    onMemberAdded,
    isDemo 
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [addedEmails, setAddedEmails] = useState([]);

    if (!isOpen || !group) return null;

    const handleSearch = async (e) => {
        e?.preventDefault();
        const term = searchQuery.trim().toLowerCase();
        if (!term) {
            setSearchResults([]);
            return;
        }

        setSearching(true);

        if (isDemo) {
            const cleanDigits = term.replace(/[^0-9]/g, '');
            const matches = PRESET_SAMPLE_USERS.filter(u => 
                u.email.toLowerCase().includes(term) ||
                u.username.toLowerCase().includes(term) ||
                (cleanDigits && u.tag.includes(cleanDigits))
            );
            setSearchResults(matches);
            setSearching(false);
            return;
        }

        try {
            const cleanDigits = term.replace(/[^0-9]/g, '');
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .or(`email.ilike.%${term}%,username.ilike.%${term}%,user_tag.ilike.%${cleanDigits || term}%`)
                .limit(10);

            if (data && data.length > 0) {
                setSearchResults(data);
            } else {
                // Fallback: check messages for unique emails
                const { data: msgUsers } = await supabase
                    .from('messages')
                    .select('email')
                    .ilike('email', `%${term}%`)
                    .limit(5);

                if (msgUsers && msgUsers.length > 0) {
                    const unique = Array.from(new Set(msgUsers.map(m => m.email)));
                    setSearchResults(unique.map(em => ({
                        email: em,
                        username: em.split('@')[0],
                        user_tag: generate6DigitId(em)
                    })));
                } else {
                    setSearchResults([]);
                }
            }
        } catch (err) {
            console.error("Error searching profiles:", err);
            setSearchResults([]);
        } finally {
            setSearching(false);
        }
    };

    const handleAddUser = (user) => {
        const email = user.email.toLowerCase();
        setAddedEmails(prev => [...prev, email]);
        if (onMemberAdded) {
            onMemberAdded(email);
        }
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content add-member-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title-row">
                        <UserPlus />
                        <h3>Add Members to "{group.name}"</h3>
                    </div>
                    <button type="button" className="modal-close-btn" onClick={onClose}>
                        <Close />
                    </button>
                </div>

                <form onSubmit={handleSearch} className="modal-search-form">
                    <div className="search-input-wrapper">
                        <Search />
                        <input 
                            type="text" 
                            placeholder="Search by 6-digit ID (e.g. 839-201) or Email..." 
                            value={searchQuery}
                            onChange={e => { setSearchQuery(e.target.value); handleSearch(e); }}
                            autoFocus
                        />
                    </div>
                </form>

                <div className="member-results-list">
                    {searching && <p className="search-status-text">Searching users...</p>}
                    
                    {!searching && searchResults.length === 0 && searchQuery.trim() && (
                        <div className="search-empty-state">
                            <p>No user found for "{searchQuery}"</p>
                            <span>Try searching by their 6-digit ID or full email address.</span>
                        </div>
                    )}

                    {!searching && searchResults.length === 0 && !searchQuery.trim() && (
                        <div className="suggested-users-section">
                            <span className="section-label">Suggested Members:</span>
                            {PRESET_SAMPLE_USERS.map(u => {
                                const isAlreadyInGroup = existingMembers.some(em => em.toLowerCase() === u.email.toLowerCase()) || addedEmails.includes(u.email.toLowerCase());
                                return (
                                    <div key={u.email} className="found-user-item">
                                        <img 
                                            src={`/avatar/avatar-${getAvatarN(u.email)}.jpg`} 
                                            alt={u.username} 
                                            className="found-user-avatar"
                                        />
                                        <div className="found-user-details">
                                            <span className="found-user-name">@{u.username}</span>
                                            <span className="found-user-tag">{formatUserTag(u.tag)} • {u.email}</span>
                                        </div>
                                        {isAlreadyInGroup ? (
                                            <span className="already-member-badge">
                                                <Check /> Added
                                            </span>
                                        ) : (
                                            <button 
                                                type="button" 
                                                className="start-chat-btn" 
                                                onClick={() => handleAddUser(u)}
                                            >
                                                + Add
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {searchResults.map(u => {
                        const isAlreadyInGroup = existingMembers.some(em => em.toLowerCase() === u.email.toLowerCase()) || addedEmails.includes(u.email.toLowerCase());
                        const tag = u.user_tag || generate6DigitId(u.email);
                        const name = u.username || u.email.split('@')[0];

                        return (
                            <div key={u.email} className="found-user-item">
                                <img 
                                    src={`/avatar/avatar-${u.avatar_num || getAvatarN(u.email)}.jpg`} 
                                    alt={name} 
                                    className="found-user-avatar"
                                />
                                <div className="found-user-details">
                                    <span className="found-user-name">@{name}</span>
                                    <span className="found-user-tag">{formatUserTag(tag)} • {u.email}</span>
                                </div>
                                {isAlreadyInGroup ? (
                                    <span className="already-member-badge">
                                        <Check /> Added
                                    </span>
                                ) : (
                                    <button 
                                        type="button" 
                                        className="start-chat-btn" 
                                        onClick={() => handleAddUser(u)}
                                    >
                                        + Add
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default AddGroupMemberModal;
