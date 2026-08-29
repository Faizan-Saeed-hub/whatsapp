import { generate6DigitId } from './userIdHelper';
import { getAvatarN } from './getAvatarN';

const DEMO_STORAGE_KEY = 'wp_demo_messages_store_v3';
const DEMO_GROUPS_KEY = 'wp_demo_groups_store_v3';
const DEMO_USER_KEY = 'wp_demo_current_user';
const DEMO_PROFILE_KEY = 'wp_demo_profile_store_v3';

const INITIAL_GROUPS = [
    {
        id: 1,
        name: "General Community",
        description: "Official community chat for all members 👋",
        created_by: "system@whatsapp.com",
        is_direct: false,
        members: ["faizan@gmail.com", "alice@test.com", "bob@test.com"],
        created_at: new Date(Date.now() - 86400000).toISOString()
    },
    {
        id: 2,
        name: "Tech & Coding",
        description: "Discuss programming, web dev, and tech trends 💻",
        created_by: "system@whatsapp.com",
        is_direct: false,
        members: ["faizan@gmail.com", "charlie@test.com"],
        created_at: new Date(Date.now() - 43200000).toISOString()
    }
];

const INITIAL_MESSAGES = [
    {
        id: 1,
        group_id: 1,
        content: "Hey there! Welcome to WhatsApp Clone 👋",
        email: "alice@test.com",
        media_type: "text",
        seen_by: ["alice@test.com", "bob@test.com"],
        created_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
        id: 2,
        group_id: 1,
        content: "You can send voice notes 🎙️, photos 📸, and files 📎 here!",
        email: "bob@test.com",
        media_type: "text",
        seen_by: ["bob@test.com"],
        created_at: new Date(Date.now() - 1800000).toISOString()
    }
];

export const getDemoUser = () => {
    return localStorage.getItem(DEMO_USER_KEY);
};

export const setDemoUser = (email) => {
    if (email) {
        localStorage.setItem(DEMO_USER_KEY, email);
    } else {
        localStorage.removeItem(DEMO_USER_KEY);
    }
};

export const getDemoProfile = (email) => {
    if (!email) return null;
    try {
        const data = localStorage.getItem(`${DEMO_PROFILE_KEY}_${email.toLowerCase()}`);
        if (data) return JSON.parse(data);
    } catch (e) {
        console.error("Error reading demo profile", e);
    }
    const isFaizan = email.toLowerCase() === 'faizan0687@gmail.com';
    const defaultProfile = {
        email: email,
        username: isFaizan ? 'Muhammad Faizan' : email.split('@')[0],
        user_tag: generate6DigitId(email),
        about: isFaizan ? 'Admin • Official WhatsApp Moderator' : 'Hey there! I am using WhatsApp.',
        avatar_num: String(getAvatarN(email)),
        avatar_url: null
    };
    saveDemoProfile(defaultProfile);
    return defaultProfile;
};

export const saveDemoProfile = (profile) => {
    if (!profile?.email) return;
    try {
        localStorage.setItem(`${DEMO_PROFILE_KEY}_${profile.email.toLowerCase()}`, JSON.stringify(profile));
        broadcastEvent('PROFILE_UPDATED', profile);
    } catch (e) {
        console.error("Error saving demo profile", e);
    }
};

export const getDemoGroups = () => {
    try {
        const data = localStorage.getItem(DEMO_GROUPS_KEY);
        if (data) {
            return JSON.parse(data);
        }
    } catch (e) {
        console.error("Error reading demo groups", e);
    }
    localStorage.setItem(DEMO_GROUPS_KEY, JSON.stringify(INITIAL_GROUPS));
    return INITIAL_GROUPS;
};

export const createDemoGroup = (name, description, email) => {
    const groups = getDemoGroups();
    const newGroup = {
        id: Date.now(),
        name,
        description: description || "",
        created_by: email,
        is_direct: false,
        members: [email],
        created_at: new Date().toISOString()
    };
    const updated = [...groups, newGroup];
    localStorage.setItem(DEMO_GROUPS_KEY, JSON.stringify(updated));
    broadcastEvent('NEW_GROUP', newGroup);
    return newGroup;
};

export const addDemoGroupMember = (groupId, newMemberEmail) => {
    const groups = getDemoGroups();
    const target = groups.find(g => String(g.id) === String(groupId));
    if (!target) return;

    const currentMembers = target.members || [target.created_by];
    if (!currentMembers.includes(newMemberEmail)) {
        target.members = [...currentMembers, newMemberEmail];
        localStorage.setItem(DEMO_GROUPS_KEY, JSON.stringify(groups));
        broadcastEvent('GROUP_UPDATED', target);
    }
    return target;
};

export const createOrGetDirectChat = (user1, user2) => {
    const groups = getDemoGroups();
    const u1 = user1.toLowerCase();
    const u2 = user2.toLowerCase();
    const isSelf = u1 === u2;

    const existing = groups.find(g => 
        g.is_direct && 
        ((g.participant1?.toLowerCase() === u1 && g.participant2?.toLowerCase() === u2) ||
         (g.participant1?.toLowerCase() === u2 && g.participant2?.toLowerCase() === u1))
    );

    if (existing) return existing;

    const otherUser = isSelf ? user1 : (u1 === user1.toLowerCase() ? user2 : user1);
    const otherName = isSelf ? `${user1.split('@')[0]} (You)` : (otherUser.includes('@') ? otherUser.split('@')[0] : otherUser);
    const otherTag = generate6DigitId(otherUser);

    const newDirectGroup = {
        id: Date.now(),
        name: isSelf ? otherName : `@${otherName}`,
        description: isSelf ? 'Message yourself • Personal notes' : `Direct private chat • #${otherTag}`,
        created_by: user1,
        is_direct: true,
        participant1: user1,
        participant2: user2,
        created_at: new Date().toISOString()
    };

    const updated = [...groups, newDirectGroup];
    localStorage.setItem(DEMO_GROUPS_KEY, JSON.stringify(updated));
    broadcastEvent('NEW_GROUP', newDirectGroup);
    return newDirectGroup;
};

export const deleteDemoGroup = (groupId) => {
    const groups = getDemoGroups();
    const updated = groups.filter(g => String(g.id) !== String(groupId));
    localStorage.setItem(DEMO_GROUPS_KEY, JSON.stringify(updated));
    
    const messages = getDemoMessages();
    const updatedMsgs = messages.filter(m => String(m.group_id) !== String(groupId));
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(updatedMsgs));

    broadcastEvent('DELETE_GROUP', { id: groupId });
};

export const clearDemoMessages = (groupId) => {
    const messages = getDemoMessages();
    const updated = messages.filter(m => String(m.group_id) !== String(groupId));
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(updated));
    broadcastEvent('CLEAR_MESSAGES', { groupId });
};

export const getDemoMessages = (groupId = null) => {
    try {
        const data = localStorage.getItem(DEMO_STORAGE_KEY);
        let messages = data ? JSON.parse(data) : INITIAL_MESSAGES;
        if (!data) {
            localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(INITIAL_MESSAGES));
        }
        if (groupId) {
            return messages.filter(m => String(m.group_id) === String(groupId));
        }
        return messages;
    } catch (e) {
        console.error("Error reading demo messages", e);
        return INITIAL_MESSAGES;
    }
};

export const sendDemoMessage = ({ content, email, group_id, media_type = 'text', media_url = null, file_name = null, file_size = null, reply_to = null, seen_by = null }) => {
    const messages = getDemoMessages();
    const newMessage = {
        id: Date.now(),
        group_id: group_id || 1,
        content: content || "",
        email,
        media_type,
        media_url,
        file_name,
        file_size,
        reply_to,
        seen_by: seen_by || [email],
        created_at: new Date().toISOString()
    };
    const updated = [...messages, newMessage];
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(updated));
    broadcastEvent('NEW_MESSAGE', newMessage);
    return newMessage;
};

export const deleteDemoMessage = (messageId) => {
    const messages = getDemoMessages();
    const updated = messages.map(m => String(m.id) === String(messageId) ? { 
        ...m, 
        content: '🚫 This message was deleted', 
        is_deleted: true, 
        media_url: null, 
        media_type: 'text',
        file_name: null,
        file_size: null
    } : m);
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(updated));
    broadcastEvent('UPDATE_MESSAGE', { 
        id: messageId, 
        content: '🚫 This message was deleted', 
        is_deleted: true,
        media_type: 'text',
        media_url: null
    });
};

const broadcastEvent = (type, payload) => {
    if (typeof BroadcastChannel !== 'undefined') {
        try {
            const channel = new BroadcastChannel('wp_demo_channel');
            channel.postMessage({ type, payload });
            channel.close();
        } catch (e) {
            console.error("BroadcastChannel error", e);
        }
    }
};
