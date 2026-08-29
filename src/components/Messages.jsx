import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { getDemoMessages, deleteDemoMessage } from '../helpers/demoChat';
import { initRealtimeChannel, broadcastGlobalEvent } from '../helpers/realtimeChannel';
import Message from './Message';
import SendMessage from './SendMessage';
import Header from './Header';
import ForwardModal from './ForwardModal';
import DeleteMessageModal from './DeleteMessageModal';
import ChatSearchBar from './ChatSearchBar';
import ChatInfoDrawer from './ChatInfoDrawer';
import FileViewerModal from './FileViewerModal';
import MessageInfoModal from './MessageInfoModal';

const Messages = ({ 
    session, 
    userProfile,
    isDemo, 
    activeGroup, 
    groups = [], 
    onBackToSidebar, 
    isAdmin, 
    showAdminView, 
    onToggleAdminView, 
    onLogout,
    onStartDirectChat,
    onForwardMessage,
    onDeleteChat,
    onClearChat,
    onToggleTheme,
    isDarkMode,
    typingUser = null,
    onBroadcastTyping = null,
    userProfilesMap = {},
    onAddMemberToGroup
}) => {
    const [messages, setMessages] = useState([]);
    const [forwardingMessage, setForwardingMessage] = useState(null);
    const [replyTo, setReplyTo] = useState(null);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
    const [isChatInfoOpen, setIsChatInfoOpen] = useState(false);
    const [mediaViewerFile, setMediaViewerFile] = useState(null);
    const [messageInfoTarget, setMessageInfoTarget] = useState(null);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [deleteModalTarget, setDeleteModalTarget] = useState(null);

    const [starredIds, setStarredIds] = useState(() => {
        try {
            const saved = localStorage.getItem('wp_starred_message_ids');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const [deletedForMeIds, setDeletedForMeIds] = useState(() => {
        try {
            const saved = localStorage.getItem('wp_deleted_for_me_ids');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const scroll = useRef(null);
    const messageRefs = useRef({});
    const supabaseChannelRef = useRef(null);

    const activeGroupId = activeGroup?.id || 1;
    const currentUserEmail = session?.user?.email || "user@demo.com";

    // 1. Fetch group messages
    const fetchMessages = async () => {
        if (!activeGroupId) return;

        if (isDemo) {
            const demoMsgs = getDemoMessages(activeGroupId);
            setMessages(demoMsgs);
            markMessagesAsSeen(demoMsgs);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('group_id', activeGroupId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            if (data) {
                setMessages(data);
                markMessagesAsSeen(data);
            }
        } catch (err) {
            console.error("Error fetching group messages:", err);
        }
    };

    // 2. Mark messages as seen & broadcast to other clients
    const markMessagesAsSeen = async (msgList = []) => {
        if (!currentUserEmail || !activeGroupId) return;
        const myEmail = currentUserEmail.toLowerCase();
        const nowIso = new Date().toISOString();

        const unreadFromOthers = msgList.filter(m => 
            m.email?.toLowerCase() !== myEmail && 
            (!m.seen_by || !m.seen_by.includes(myEmail))
        );

        if (unreadFromOthers.length === 0) return;

        // 1. Broadcast seen status immediately to all devices (Mobile <-> PC)
        broadcastGlobalEvent('MESSAGES_SEEN', { groupId: activeGroupId, seenBy: myEmail, seenAt: nowIso });

        // 2. Persist to database
        try {
            for (const m of unreadFromOthers) {
                const updatedSeen = [...(m.seen_by || []), myEmail];
                await supabase.from('messages').update({ 
                    seen_by: updatedSeen,
                    seen_at: nowIso
                }).eq('id', m.id);
            }
        } catch (err) {
            console.warn("Seen status sync note:", err.message);
        }
    };

    useEffect(() => {
        fetchMessages();
        setReplyTo(null);
        setSelectedMessage(null);
        setSearchQuery('');
        setIsSearchOpen(false);
    }, [activeGroupId, isDemo]);

    // 3. Universal Cross-Device Realtime Subscriptions (Mobile <-> PC)
    useEffect(() => {
        const unsubscribe = initRealtimeChannel(({ type, payload }) => {
            if (type === 'NEW_MESSAGE') {
                const newMsg = payload;
                if (String(newMsg.group_id) === String(activeGroupId)) {
                    setMessages(prev => {
                        if (prev.some(m => String(m.id) === String(newMsg.id))) return prev;
                        return [...prev, newMsg];
                    });
                    markMessagesAsSeen([newMsg]);
                }
            } else if (type === 'MESSAGE_DELETED') {
                const targetId = payload.msgId || payload.id;
                setMessages(prev => prev.map(m => String(m.id) === String(targetId) ? {
                    ...m,
                    content: '🚫 This message was deleted',
                    is_deleted: true,
                    media_url: null,
                    media_type: 'text'
                } : m));
            } else if (type === 'REACTION_UPDATED') {
                const { msgId, reactions } = payload;
                setMessages(prev => prev.map(m => String(m.id) === String(msgId) ? {
                    ...m,
                    reactions
                } : m));
            } else if (type === 'MESSAGES_SEEN') {
                if (String(payload?.groupId) === String(activeGroupId)) {
                    const { seenBy, seenAt } = payload;
                    setMessages(prev => prev.map(m => ({
                        ...m,
                        seen_by: Array.from(new Set([...(m.seen_by || []), seenBy])),
                        seen_at: seenAt || m.seen_at
                    })));
                }
            }
        });

        return () => unsubscribe();
    }, [activeGroupId]);

    useEffect(() => {
        if (scroll.current && !searchQuery) {
            scroll.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleNewLocalMessage = (newMessage) => {
        setMessages(prev => {
            if (prev.some(m => String(m.id) === String(newMessage.id))) return prev;
            return [...prev, newMessage];
        });
    };

    // Reaction Toggle
    const handleToggleReaction = async (msgId, emoji) => {
        const targetMsg = messages.find(m => String(m.id) === String(msgId));
        if (!targetMsg) return;

        const currentReactions = { ...(targetMsg.reactions || {}) };
        const userList = currentReactions[emoji] ? [...currentReactions[emoji]] : [];
        const myEmail = currentUserEmail.toLowerCase();

        if (userList.includes(myEmail)) {
            currentReactions[emoji] = userList.filter(e => e !== myEmail);
            if (currentReactions[emoji].length === 0) {
                delete currentReactions[emoji];
            }
        } else {
            currentReactions[emoji] = [...userList, myEmail];
        }

        setMessages(prev => prev.map(m => String(m.id) === String(msgId) ? { ...m, reactions: currentReactions } : m));

        // 1. Broadcast reaction update to all devices across internet (Mobile <-> PC)
        broadcastGlobalEvent('REACTION_UPDATED', { msgId, reactions: currentReactions });

        // 2. Persist locally
        const bcMsg = { ...targetMsg, reactions: currentReactions };
        sendDemoMessage(bcMsg);

        // 3. Persist to database
        try {
            await supabase.from('messages').update({ reactions: currentReactions }).eq('id', msgId);
        } catch (err) {
            console.warn("Reaction cloud sync note:", err.message);
        }
    };

    // Star Toggle
    const handleToggleStar = (msgId) => {
        let updated;
        if (starredIds.includes(msgId)) {
            updated = starredIds.filter(id => id !== msgId);
        } else {
            updated = [...starredIds, msgId];
        }
        setStarredIds(updated);
        localStorage.setItem('wp_starred_message_ids', JSON.stringify(updated));
    };

    // Deletion
    const handleDeleteMessage = async (msgId, type = 'everyone') => {
        const targetMsg = messages.find(m => String(m.id) === String(msgId));
        if (!targetMsg) return;

        setDeleteModalTarget(null);
        setSelectedMessage(null);

        if (type === 'me') {
            const updated = [...deletedForMeIds, msgId];
            setDeletedForMeIds(updated);
            localStorage.setItem('wp_deleted_for_me_ids', JSON.stringify(updated));
            return;
        }

        const deletedPayload = {
            ...targetMsg,
            content: '🚫 This message was deleted',
            is_deleted: true,
            media_type: 'text',
            media_url: null,
            file_name: null,
            file_size: null
        };

        setMessages(prev => prev.map(m => String(m.id) === String(msgId) ? deletedPayload : m));

        // 1. Broadcast deletion to all devices across internet (Mobile <-> PC)
        broadcastGlobalEvent('MESSAGE_DELETED', { msgId, id: msgId });

        // 2. Delete locally
        deleteDemoMessage(msgId);

        // 3. Delete in database
        try {
            await supabase
                .from('messages')
                .update({
                    content: '🚫 This message was deleted',
                    media_type: 'text',
                    media_url: null,
                    file_name: null,
                    file_size: null,
                    is_deleted: true
                })
                .eq('id', msgId);
        } catch (err) {
            console.warn("Message deletion cloud sync note:", err.message);
        }
    };

    // Header Action Handlers
    const handleReplySelected = (msg) => {
        setReplyTo({
            id: msg.id,
            sender: msg.email ? (msg.email.split('@')[0]) : 'User',
            text: msg.content || (msg.media_type ? `[${msg.media_type}]` : 'Message'),
            media_type: msg.media_type
        });
        setSelectedMessage(null);
    };

    const handleCopySelected = (text) => {
        if (text) {
            navigator.clipboard.writeText(text);
            alert("Copied message to clipboard!");
        }
        setSelectedMessage(null);
    };

    const handleForwardSelected = (msg) => {
        setForwardingMessage(msg);
        setSelectedMessage(null);
    };

    const handleInfoSelected = (msg) => {
        setMessageInfoTarget(msg);
        setSelectedMessage(null);
    };

    const handleDeleteSelected = (msgId) => {
        const msg = messages.find(m => String(m.id) === String(msgId));
        if (msg) {
            const isMe = msg.email?.toLowerCase() === currentUserEmail?.toLowerCase();
            setDeleteModalTarget({ id: msgId, isMe });
        }
    };

    const visibleMessages = messages.filter(m => !deletedForMeIds.includes(m.id));
    const matchingMessageIds = searchQuery.trim() 
        ? visibleMessages.filter(m => m.content && m.content.toLowerCase().includes(searchQuery.toLowerCase())).map(m => m.id)
        : [];

    const handleNextMatch = () => {
        if (matchingMessageIds.length === 0) return;
        const next = (currentMatchIndex + 1) % matchingMessageIds.length;
        setCurrentMatchIndex(next);
        scrollToMessage(matchingMessageIds[next]);
    };

    const handlePrevMatch = () => {
        if (matchingMessageIds.length === 0) return;
        const prev = (currentMatchIndex - 1 + matchingMessageIds.length) % matchingMessageIds.length;
        setCurrentMatchIndex(prev);
        scrollToMessage(matchingMessageIds[prev]);
    };

    const scrollToMessage = (msgId) => {
        const el = messageRefs.current[msgId];
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    return (
        <section className="chat-window">
            <Header 
                activeGroup={activeGroup} 
                onBackToSidebar={onBackToSidebar}
                isAdmin={isAdmin}
                showAdminView={showAdminView}
                onToggleAdminView={onToggleAdminView}
                onLogout={onLogout}
                currentUserEmail={currentUserEmail}
                userProfile={userProfile}
                onDeleteChat={onDeleteChat}
                onClearChat={onClearChat}
                onToggleSearch={() => setIsSearchOpen(!isSearchOpen)}
                onToggleChatInfo={() => setIsChatInfoOpen(!isChatInfoOpen)}
                onToggleTheme={onToggleTheme}
                isDarkMode={isDarkMode}
                typingUser={typingUser}
                selectedMessage={selectedMessage}
                onClearSelectedMessage={() => setSelectedMessage(null)}
                onReplySelected={handleReplySelected}
                onStarSelected={handleToggleStar}
                onCopySelected={handleCopySelected}
                onForwardSelected={handleForwardSelected}
                onDeleteSelected={handleDeleteSelected}
                onInfoSelected={handleInfoSelected}
            />

            {/* In-Chat Search Bar */}
            <ChatSearchBar 
                isOpen={isSearchOpen}
                onClose={() => { setIsSearchOpen(false); setSearchQuery(''); }}
                query={searchQuery}
                onChangeQuery={(q) => { setSearchQuery(q); setCurrentMatchIndex(0); }}
                currentMatchIndex={currentMatchIndex}
                totalMatches={matchingMessageIds.length}
                onNextMatch={handleNextMatch}
                onPrevMatch={handlePrevMatch}
            />

            <div className="messages-stream">
                {visibleMessages.length === 0 ? (
                    <div className="empty-chat">
                        <p>No messages yet in <strong>{activeGroup?.name || "this chat"}</strong></p>
                        <span>Send a message, voice note, photo, or file to start the conversation!</span>
                    </div>
                ) : (
                    visibleMessages.map((item, index) => {
                        const isMatch = matchingMessageIds.includes(item.id);
                        const isCurrentSelectedMatch = matchingMessageIds[currentMatchIndex] === item.id;
                        const isSelected = selectedMessage && String(selectedMessage.id) === String(item.id);

                        return (
                            <div key={item.id || index} ref={el => messageRefs.current[item.id] = el}>
                                <Message 
                                    id={item.id}
                                    message={item.content}
                                    date={item.created_at}
                                    email={item.email}
                                    media_type={item.media_type}
                                    media_url={item.media_url}
                                    file_name={item.file_name}
                                    file_size={item.file_size}
                                    is_deleted={item.is_deleted || item.content === '🚫 This message was deleted'}
                                    reply_to={item.reply_to}
                                    reactions={item.reactions}
                                    isStarred={starredIds.includes(item.id)}
                                    seen_by={item.seen_by}
                                    seen_at={item.seen_at}
                                    currentUserEmail={currentUserEmail}
                                    isAdmin={isAdmin}
                                    onToggleReaction={handleToggleReaction}
                                    onSelectMessage={setSelectedMessage}
                                    isSelected={isSelected}
                                    isHighlighted={isMatch && isCurrentSelectedMatch}
                                    userProfilesMap={userProfilesMap}
                                />
                            </div>
                        );
                    })
                )}
                <span ref={scroll}></span>
            </div>

            <SendMessage 
                scroll={scroll}
                session={session}
                isDemo={isDemo}
                activeGroupId={activeGroupId}
                onNewLocalMessage={handleNewLocalMessage}
                replyTo={replyTo}
                onCancelReply={() => setReplyTo(null)}
                onTyping={onBroadcastTyping}
            />

            {/* Forward Message Modal */}
            <ForwardModal 
                isOpen={Boolean(forwardingMessage)}
                onClose={() => setForwardingMessage(null)}
                message={forwardingMessage}
                groups={groups}
                currentUserEmail={currentUserEmail}
                onForwardMessage={onForwardMessage}
            />

            {/* Delete Modal */}
            {deleteModalTarget && (
                <DeleteMessageModal 
                    isOpen={Boolean(deleteModalTarget)}
                    onClose={() => setDeleteModalTarget(null)}
                    isMe={deleteModalTarget.isMe}
                    isAdmin={isAdmin}
                    onDeleteForEveryone={() => handleDeleteMessage(deleteModalTarget.id, 'everyone')}
                    onDeleteForMe={() => handleDeleteMessage(deleteModalTarget.id, 'me')}
                />
            )}

            {/* Contact / Group Info Drawer */}
            <ChatInfoDrawer 
                isOpen={isChatInfoOpen}
                onClose={() => setIsChatInfoOpen(false)}
                activeGroup={activeGroup}
                messages={visibleMessages}
                currentUserEmail={currentUserEmail}
                starredIds={starredIds}
                userProfilesMap={userProfilesMap}
                onAddMemberToGroup={onAddMemberToGroup}
                isDemo={isDemo}
                onOpenMedia={(item) => setMediaViewerFile({
                    url: item.media_url,
                    name: item.file_name || 'media',
                    size: item.file_size,
                    type: item.media_type
                })}
            />

            {/* Universal Media Viewer */}
            <FileViewerModal 
                isOpen={Boolean(mediaViewerFile)}
                onClose={() => setMediaViewerFile(null)}
                file={mediaViewerFile}
            />

            {/* WhatsApp Message Info Modal */}
            <MessageInfoModal 
                isOpen={Boolean(messageInfoTarget)}
                onClose={() => setMessageInfoTarget(null)}
                message={messageInfoTarget}
                currentUserEmail={currentUserEmail}
                userProfilesMap={userProfilesMap}
            />
        </section>
    );
};

export default Messages;