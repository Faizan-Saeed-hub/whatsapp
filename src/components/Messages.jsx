import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { getDemoMessages, deleteDemoMessage } from '../helpers/demoChat';
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

        if (supabaseChannelRef.current) {
            supabaseChannelRef.current.send({
                type: 'broadcast',
                event: 'MESSAGES_SEEN',
                payload: { groupId: activeGroupId, seenBy: myEmail, seenAt: nowIso }
            });
        }

        if (isDemo) {
            if (typeof BroadcastChannel !== 'undefined') {
                const bc = new BroadcastChannel('wp_demo_channel');
                bc.postMessage({
                    type: 'MESSAGES_SEEN',
                    payload: { groupId: activeGroupId, seenBy: myEmail, seenAt: nowIso }
                });
                bc.close();
            }
            return;
        }

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

    // 3. Realtime Subscriptions
    useEffect(() => {
        if (isDemo) {
            if (typeof BroadcastChannel !== 'undefined') {
                const channel = new BroadcastChannel('wp_demo_channel');
                channel.onmessage = (e) => {
                    if (e.data?.type === 'NEW_MESSAGE') {
                        const newMsg = e.data.payload || e.data.message;
                        if (String(newMsg.group_id) === String(activeGroupId)) {
                            setMessages(prev => {
                                if (prev.some(m => String(m.id) === String(newMsg.id))) return prev;
                                return [...prev, newMsg];
                            });
                            markMessagesAsSeen([newMsg]);
                        }
                    } else if (e.data?.type === 'DELETE_MESSAGE') {
                        const targetId = e.data.payload.id;
                        setMessages(prev => prev.map(m => String(m.id) === String(targetId) ? {
                            ...m,
                            content: '🚫 This message was deleted',
                            is_deleted: true,
                            media_url: null,
                            media_type: 'text'
                        } : m));
                    } else if (e.data?.type === 'UPDATE_MESSAGE') {
                        const updatedMsg = e.data.payload;
                        setMessages(prev => prev.map(m => String(m.id) === String(updatedMsg.id) ? { ...m, ...updatedMsg } : m));
                    } else if (e.data?.type === 'MESSAGES_SEEN') {
                        if (String(e.data.payload?.groupId) === String(activeGroupId)) {
                            const { seenBy, seenAt } = e.data.payload;
                            setMessages(prev => prev.map(m => ({
                                ...m,
                                seen_by: Array.from(new Set([...(m.seen_by || []), seenBy])),
                                seen_at: seenAt || m.seen_at
                            })));
                        }
                    }
                };
                return () => channel.close();
            }
            return;
        }

        const channel = supabase
            .channel(`group-realtime-room-${activeGroupId}`, {
                config: { broadcast: { self: false } }
            })
            .on('broadcast', { event: 'REACTION_UPDATED' }, ({ payload }) => {
                setMessages(prev => prev.map(m => String(m.id) === String(payload.msgId) ? {
                    ...m,
                    reactions: payload.reactions
                } : m));
            })
            .on('broadcast', { event: 'MESSAGE_DELETED' }, ({ payload }) => {
                setMessages(prev => prev.map(m => String(m.id) === String(payload.msgId) ? {
                    ...m,
                    content: '🚫 This message was deleted',
                    is_deleted: true,
                    media_url: null,
                    media_type: 'text'
                } : m));
            })
            .on('broadcast', { event: 'NEW_MESSAGE' }, ({ payload }) => {
                if (String(payload.group_id) === String(activeGroupId)) {
                    setMessages(prev => {
                        if (prev.some(m => String(m.id) === String(payload.id))) return prev;
                        return [...prev, payload];
                    });
                    markMessagesAsSeen([payload]);
                }
            })
            .on('broadcast', { event: 'MESSAGES_SEEN' }, ({ payload }) => {
                if (String(payload.groupId) === String(activeGroupId)) {
                    setMessages(prev => prev.map(m => ({
                        ...m,
                        seen_by: Array.from(new Set([...(m.seen_by || []), payload.seenBy])),
                        seen_at: payload.seenAt || m.seen_at
                    })));
                }
            })
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `group_id=eq.${activeGroupId}` },
                (payload) => {
                    setMessages(prev => {
                        if (prev.some(m => String(m.id) === String(payload.new.id))) return prev;
                        return [...prev, payload.new];
                    });
                    markMessagesAsSeen([payload.new]);
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'messages', filter: `group_id=eq.${activeGroupId}` },
                (payload) => {
                    setMessages(prev => prev.map(m => String(m.id) === String(payload.new.id) ? { ...m, ...payload.new } : m));
                }
            )
            .on(
                'postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'messages' },
                (payload) => {
                    setMessages(prev => prev.map(m => String(m.id) === String(payload.old.id) ? {
                        ...m,
                        content: '🚫 This message was deleted',
                        is_deleted: true,
                        media_url: null,
                        media_type: 'text'
                    } : m));
                }
            )
            .subscribe();

        supabaseChannelRef.current = channel;

        return () => {
            supabase.removeChannel(channel);
            supabaseChannelRef.current = null;
        };
    }, [activeGroupId, isDemo, currentUserEmail]);

    useEffect(() => {
        if (scroll.current && !searchQuery) {
            scroll.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleNewLocalMessage = (newMessage) => {
        setMessages(prev => [...prev, newMessage]);
        if (supabaseChannelRef.current) {
            supabaseChannelRef.current.send({
                type: 'broadcast',
                event: 'NEW_MESSAGE',
                payload: newMessage
            });
        }
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

        if (supabaseChannelRef.current) {
            supabaseChannelRef.current.send({
                type: 'broadcast',
                event: 'REACTION_UPDATED',
                payload: { msgId, reactions: currentReactions }
            });
        }

        if (isDemo) {
            if (typeof BroadcastChannel !== 'undefined') {
                const bc = new BroadcastChannel('wp_demo_channel');
                bc.postMessage({ type: 'UPDATE_MESSAGE', payload: { ...targetMsg, reactions: currentReactions } });
                bc.close();
            }
            return;
        }

        try {
            await supabase.from('messages').update({ reactions: currentReactions }).eq('id', msgId);
        } catch (err) {
            console.error("Error updating reactions in DB:", err);
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

        if (supabaseChannelRef.current) {
            supabaseChannelRef.current.send({
                type: 'broadcast',
                event: 'MESSAGE_DELETED',
                payload: { msgId }
            });
        }

        if (isDemo) {
            deleteDemoMessage(msgId);
            return;
        }

        try {
            const { error } = await supabase
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

            if (error) {
                await supabase.from('messages').delete().eq('id', msgId);
            }
        } catch (err) {
            console.error("Error deleting message from Supabase:", err);
            try {
                await supabase.from('messages').delete().eq('id', msgId);
            } catch (e) {
                console.error("Fallback delete error:", e);
            }
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