import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { generate6DigitId, formatUserTag } from '../helpers/userIdHelper';
import { getAvatarN } from '../helpers/getAvatarN';
import Close from './icons/Close';
import Search from './icons/Search';
import Copy from './icons/Copy';
import Check from './icons/Check';
import Lock from './icons/Lock';

const NewPrivateChatModal = ({ 
    isOpen, 
    onClose, 
    currentUserEmail, 
    onStartDirectChat, 
    isDemo,
    allKnownUsers = []
}) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [copied, setCopied] = useState(false);

    const my6DigitId = generate6DigitId(currentUserEmail);

    useEffect(() => {
        if (!isOpen) {
            setQuery('');
            setResults([]);
            setHasSearched(false);
        }
    }, [isOpen]);

    const handleCopyMyId = () => {
        navigator.clipboard.writeText(my6DigitId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        const trimmed = query.trim().toLowerCase().replace('#', '');
        if (!trimmed) {
            setResults([]);
            setHasSearched(false);
            return;
        }

        setSearching(true);
        setHasSearched(true);

        try {
            // Check if user searched their own ID or email
            const isSelfSearch = trimmed === currentUserEmail.toLowerCase() || 
                                 trimmed === my6DigitId ||
                                 currentUserEmail.toLowerCase().includes(trimmed);

            if (isSelfSearch) {
                setResults([{
                    email: currentUserEmail,
                    user_tag: my6DigitId,
                    isSelf: true
                }]);
                setSearching(false);
                return;
            }

            if (isDemo) {
                const demoList = [
                    'faizan0687@gmail.com',
                    'faizan@gmail.com',
                    'ali@gmail.com',
                    'bob@test.com',
                    'alice@test.com',
                    ...allKnownUsers
                ];
                const unique = Array.from(new Set(demoList.map(em => em.toLowerCase())));
                
                const matches = unique.filter(em => {
                    const tag = generate6DigitId(em);
                    return em.includes(trimmed) || tag.includes(trimmed);
                });

                // Strictly ONLY matched registered demo users (NO arbitrary fake user creation)
                setResults(matches.map(em => ({
                    email: em,
                    user_tag: generate6DigitId(em),
                    isSelf: em.toLowerCase() === currentUserEmail.toLowerCase()
                })));
                setSearching(false);
                return;
            }

            // Supabase search: query ONLY genuinely registered users in profiles table
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .or(`email.ilike.%${trimmed}%,username.ilike.%${trimmed}%,user_tag.eq.${trimmed}`);

            let matchedUsers = profileData || [];

            // If no direct profile match, check users who have sent messages
            if (matchedUsers.length === 0) {
                const { data: msgData } = await supabase
                    .from('messages')
                    .select('email')
                    .ilike('email', `%${trimmed}%`)
                    .limit(10);

                if (msgData && msgData.length > 0) {
                    const uniqueEmails = Array.from(new Set(msgData.map(m => m.email.toLowerCase())));
                    matchedUsers = uniqueEmails.map(em => ({
                        email: em,
                        username: em.split('@')[0],
                        user_tag: generate6DigitId(em)
                    }));
                }
            }

            // Strictly ONLY return found registered users (NO fallback generation)
            setResults(matchedUsers.map(u => ({
                ...u,
                isSelf: u.email.toLowerCase() === currentUserEmail.toLowerCase()
            })));
        } catch (err) {
            console.error("Search users error:", err);
            setResults([]);
        } finally {
            setSearching(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content private-chat-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="private-modal-title">
                        <Lock />
                        <h3>New Direct Private Chat</h3>
                    </div>
                    <button type="button" className="modal-close-btn" onClick={onClose}>
                        <Close />
                    </button>
                </div>

                {/* My ID Banner & Message Yourself Option */}
                <div className="my-id-card">
                    <div>
                        <span className="my-id-label">Your 6-Digit ID:</span>
                        <strong className="my-id-code">{formatUserTag(my6DigitId)}</strong>
                    </div>
                    <div className="my-id-actions">
                        <button type="button" className="copy-my-id-btn" onClick={handleCopyMyId}>
                            {copied ? <Check /> : <Copy />}
                            <span>{copied ? "Copied!" : "Copy"}</span>
                        </button>
                        <button 
                            type="button" 
                            className="self-chat-quick-btn"
                            onClick={() => {
                                if (onStartDirectChat) onStartDirectChat(currentUserEmail, my6DigitId);
                                onClose();
                            }}
                            title="Open your personal notes chat"
                        >
                            Message Yourself
                        </button>
                    </div>
                </div>

                {/* Search Input Form */}
                <form onSubmit={handleSearch} className="private-search-form">
                    <div className="modal-search">
                        <Search />
                        <input 
                            type="text" 
                            placeholder="Enter registered 6-digit ID (e.g. 849201) or Email..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            autoFocus
                        />
                        <button type="submit" className="search-action-btn" disabled={searching}>
                            {searching ? "Searching..." : "Search"}
                        </button>
                    </div>
                </form>

                {/* Results List */}
                <div className="private-search-results">
                    {searching && <p className="search-status-text">Searching registered users...</p>}

                    {!searching && hasSearched && results.length === 0 && (
                        <div className="search-empty-state">
                            <p>No registered user found for <strong>"{query}"</strong></p>
                            <span>Only registered users with this 6-digit ID or email can be chatted with.</span>
                        </div>
                    )}

                    {!searching && !hasSearched && (
                        <div className="search-empty-state">
                            <p>Search a friend by their <strong>6-digit ID</strong> or <strong>email</strong> to start a private 1-on-1 chat.</p>
                        </div>
                    )}

                    {!searching && results.map(user => {
                        const name = user.username || (user.email.includes('@') ? user.email.split('@')[0] : user.email);
                        const tag = user.user_tag || generate6DigitId(user.email);
                        return (
                            <div key={user.email} className={`found-user-item ${user.isSelf ? 'self-item' : ''}`}>
                                <img 
                                    src={`/avatar/avatar-${user.avatar_num || getAvatarN(user.email)}.jpg`} 
                                    alt={name} 
                                    className="found-user-avatar"
                                />
                                <div className="found-user-details">
                                    <div className="found-user-name">
                                        {user.isSelf ? `${name} (You)` : `@${name}`}
                                    </div>
                                    <div className="found-user-tag">
                                        {formatUserTag(tag)} • {user.isSelf ? 'Message yourself' : user.email}
                                    </div>
                                </div>
                                <button 
                                    type="button" 
                                    className="start-chat-btn"
                                    onClick={() => {
                                        if (onStartDirectChat) onStartDirectChat(user.email, tag);
                                        onClose();
                                    }}
                                >
                                    {user.isSelf ? "Open Notes" : "Chat"}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default NewPrivateChatModal;
