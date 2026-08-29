import './App.css';
import { useEffect, useState, useRef } from 'react';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Messages from './components/Messages';
import AdminPanel from './components/AdminPanel';
import { supabase } from './supabaseClient';
import { getDemoUser, setDemoUser, getDemoGroups, createOrGetDirectChat, sendDemoMessage, getDemoProfile, saveDemoProfile, deleteDemoGroup, clearDemoMessages, addDemoGroupMember } from './helpers/demoChat';
import { generate6DigitId } from './helpers/userIdHelper';
import { getAvatarN } from './helpers/getAvatarN';
import { soundHelper } from './helpers/soundHelper';

const STRICT_ADMIN_EMAIL = 'faizan0687@gmail.com';

function App() {
  const [session, setSession] = useState(null);
  const [demoUser, setLocalDemoUser] = useState(getDemoUser());
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [showAdminView, setShowAdminView] = useState(false);
  const [mobileScreen, setMobileScreen] = useState('sidebar');
  const [allKnownUsers, setAllKnownUsers] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [userProfilesMap, setUserProfilesMap] = useState({}); // { [email]: profile }

  // Pinned chats
  const [pinnedGroupIds, setPinnedGroupIds] = useState(() => {
    try {
      const saved = localStorage.getItem('wp_pinned_group_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Dark Theme
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('wp_theme_dark') === 'true';
  });

  // Typing status map: { [groupId]: string }
  const [typingGroupMap, setTypingGroupMap] = useState({});

  const activeGroupRef = useRef(activeGroup);
  useEffect(() => {
    activeGroupRef.current = activeGroup;
  }, [activeGroup]);

  const activeUserEmail = session?.user?.email || demoUser;
  // Strictly only Faizan0687@gmail.com is Admin
  const isAdmin = Boolean(
    activeUserEmail && activeUserEmail.trim().toLowerCase() === STRICT_ADMIN_EMAIL.toLowerCase()
  );

  // Apply dark mode class to root body
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    localStorage.setItem('wp_theme_dark', isDarkMode);
  }, [isDarkMode]);

  // Close open chat or admin view on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showAdminView) {
          setShowAdminView(false);
        } else if (activeGroup) {
          setActiveGroup(null);
          setMobileScreen('sidebar');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeGroup, showAdminView]);

  // Close chat on browser Back navigation
  useEffect(() => {
    const handlePopState = () => {
      if (activeGroup) {
        setActiveGroup(null);
        setMobileScreen('sidebar');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeGroup]);

  // 1. Initial auth & session tracking
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    }).catch(err => {
      console.warn("Could not reach Supabase endpoint:", err);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setDemoUser(null);
        setLocalDemoUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const isDemo = !session && !!demoUser;

  // 2. Load / Sync User Profile & All User Profiles Map
  const loadAllProfiles = async () => {
    if (isDemo) return;
    try {
      const { data } = await supabase.from('profiles').select('*');
      if (data) {
        const map = {};
        data.forEach(p => {
          map[p.email.toLowerCase()] = p;
        });
        setUserProfilesMap(map);
      }
    } catch (err) {
      console.warn("Error loading profiles:", err);
    }
  };

  const loadProfile = async () => {
    if (!activeUserEmail) return;

    if (isDemo) {
      const p = getDemoProfile(activeUserEmail);
      setUserProfile(p);
      setUserProfilesMap(prev => ({
        ...prev,
        [activeUserEmail.toLowerCase()]: p
      }));
      return;
    }

    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', activeUserEmail.toLowerCase())
        .single();

      if (data) {
        setUserProfile(data);
        setUserProfilesMap(prev => ({
          ...prev,
          [activeUserEmail.toLowerCase()]: data
        }));
      } else {
        const initial = {
          email: activeUserEmail.toLowerCase(),
          username: activeUserEmail.split('@')[0],
          user_tag: generate6DigitId(activeUserEmail),
          about: 'Hey there! I am using WhatsApp.',
          avatar_num: String(getAvatarN(activeUserEmail)),
          avatar_url: null
        };
        const { data: created } = await supabase.from('profiles').insert(initial).select().single();
        const saved = created || initial;
        setUserProfile(saved);
        setUserProfilesMap(prev => ({
          ...prev,
          [activeUserEmail.toLowerCase()]: saved
        }));
      }
    } catch (err) {
      console.warn("Profile fetch fallback:", err);
      const fallback = {
        email: activeUserEmail,
        username: activeUserEmail.split('@')[0],
        user_tag: generate6DigitId(activeUserEmail),
        about: 'Hey there! I am using WhatsApp.',
        avatar_num: String(getAvatarN(activeUserEmail)),
        avatar_url: null
      };
      setUserProfile(fallback);
      setUserProfilesMap(prev => ({
        ...prev,
        [activeUserEmail.toLowerCase()]: fallback
      }));
    }
  };

  useEffect(() => {
    if (activeUserEmail) {
      loadProfile();
      loadAllProfiles();
    }
  }, [activeUserEmail, isDemo]);

  const handleUpdateProfile = async (newProfile) => {
    setUserProfile(newProfile);
    setUserProfilesMap(prev => ({
      ...prev,
      [newProfile.email.toLowerCase()]: newProfile
    }));

    if (isDemo) {
      saveDemoProfile(newProfile);
      return;
    }

    try {
      await supabase.from('profiles').upsert(newProfile);
    } catch (err) {
      console.error("Error updating profile in Supabase:", err);
    }
  };

  // 3. Fetch groups & known users
  const fetchGroups = async () => {
    if (isDemo) {
      const demoGrpList = getDemoGroups();
      setGroups(demoGrpList);
      if (!activeGroup && demoGrpList.length > 0) {
        setActiveGroup(demoGrpList[0]);
      }
      return;
    }

    try {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.warn("Error fetching groups from Supabase:", error);
        const defaultGrp = { id: 1, name: "General Community", description: "Main community chat", is_direct: false };
        setGroups([defaultGrp]);
        if (!activeGroup) setActiveGroup(defaultGrp);
      } else if (data && data.length > 0) {
        setGroups(data);
        if (!activeGroup) setActiveGroup(data[0]);
      } else {
        const defaultGrp = { id: 1, name: "General Community", description: "Main community chat", is_direct: false };
        setGroups([defaultGrp]);
        if (!activeGroup) setActiveGroup(defaultGrp);
      }

      const { data: msgUsers } = await supabase.from('messages').select('email').limit(50);
      if (msgUsers) {
        const unique = Array.from(new Set(msgUsers.map(m => m.email))).filter(Boolean);
        setAllKnownUsers(unique);
      }
    } catch (err) {
      console.error("Groups fetch exception:", err);
    }
  };

  useEffect(() => {
    if (session || demoUser) {
      fetchGroups();
    }
  }, [session, demoUser, isDemo]);

  // 4. Realtime listener for incoming messages, typing, profile DP updates
  useEffect(() => {
    if (isDemo) {
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('wp_demo_channel');
        channel.onmessage = (e) => {
          if (e.data?.type === 'NEW_MESSAGE') {
            const newMsg = e.data.payload || e.data.message;
            const fromOther = newMsg.email?.toLowerCase() !== activeUserEmail?.toLowerCase();
            
            if (fromOther) {
              soundHelper.playIncomingChime();
              const currentActiveId = activeGroupRef.current?.id;
              if (String(currentActiveId) !== String(newMsg.group_id)) {
                setUnreadCounts(prev => ({
                  ...prev,
                  [newMsg.group_id]: (prev[newMsg.group_id] || 0) + 1
                }));
              }
            }
          } else if (e.data?.type === 'USER_TYPING') {
            const { groupId, email } = e.data.payload;
            if (email?.toLowerCase() !== activeUserEmail?.toLowerCase()) {
              handleIncomingTyping(groupId, email.split('@')[0]);
            }
          } else if (e.data?.type === 'NEW_GROUP') {
            setGroups(prev => {
              if (prev.some(g => g.id === e.data.payload.id)) return prev;
              return [...prev, e.data.payload];
            });
          } else if (e.data?.type === 'GROUP_UPDATED') {
            setGroups(prev => prev.map(g => g.id === e.data.payload.id ? e.data.payload : g));
            if (activeGroupRef.current?.id === e.data.payload.id) {
              setActiveGroup(e.data.payload);
            }
          } else if (e.data?.type === 'DELETE_GROUP') {
            setGroups(prev => prev.filter(g => g.id !== e.data.payload.id));
            if (activeGroupRef.current?.id === e.data.payload.id) {
              setActiveGroup(null);
            }
          } else if (e.data?.type === 'PROFILE_UPDATED') {
            const updatedP = e.data.payload;
            setUserProfilesMap(prev => ({
              ...prev,
              [updatedP.email?.toLowerCase()]: updatedP
            }));
            if (updatedP.email?.toLowerCase() === activeUserEmail?.toLowerCase()) {
              setUserProfile(updatedP);
            }
          }
        };
        return () => channel.close();
      }
      return;
    }

    const msgChannel = supabase
      .channel('global-notifications-master-v3')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const newMsg = payload.new;
        const fromOther = newMsg.email?.toLowerCase() !== activeUserEmail?.toLowerCase();

        if (fromOther) {
          soundHelper.playIncomingChime();
          const currentActiveId = activeGroupRef.current?.id;
          if (String(currentActiveId) !== String(newMsg.group_id)) {
            setUnreadCounts(prev => ({
              ...prev,
              [newMsg.group_id]: (prev[newMsg.group_id] || 0) + 1
            }));
          }
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'groups' }, (payload) => {
        setGroups(prev => {
          if (prev.some(g => g.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'groups' }, (payload) => {
        setGroups(prev => prev.map(g => g.id === payload.new.id ? payload.new : g));
        if (activeGroupRef.current?.id === payload.new.id) {
          setActiveGroup(payload.new);
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'groups' }, (payload) => {
        setGroups(prev => prev.filter(g => g.id !== payload.old.id));
        if (activeGroupRef.current?.id === payload.old.id) {
          setActiveGroup(null);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
        if (payload.new) {
          const updated = payload.new;
          setUserProfilesMap(prev => ({
            ...prev,
            [updated.email?.toLowerCase()]: updated
          }));
          if (updated.email?.toLowerCase() === activeUserEmail?.toLowerCase()) {
            setUserProfile(updated);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
    };
  }, [isDemo, activeUserEmail]);

  const handleIncomingTyping = (groupId, userName) => {
    setTypingGroupMap(prev => ({
      ...prev,
      [groupId]: userName
    }));

    setTimeout(() => {
      setTypingGroupMap(prev => {
        const copy = { ...prev };
        delete copy[groupId];
        return copy;
      });
    }, 2500);
  };

  const handleBroadcastTyping = () => {
    if (!activeGroup || !activeUserEmail) return;

    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const channel = new BroadcastChannel('wp_demo_channel');
        channel.postMessage({
          type: 'USER_TYPING',
          payload: { groupId: activeGroup.id, email: activeUserEmail }
        });
        channel.close();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleTogglePinChat = (groupId) => {
    let updated;
    if (pinnedGroupIds.includes(groupId)) {
      updated = pinnedGroupIds.filter(id => id !== groupId);
    } else {
      updated = [groupId, ...pinnedGroupIds];
    }
    setPinnedGroupIds(updated);
    localStorage.setItem('wp_pinned_group_ids', JSON.stringify(updated));
  };

  const handleSelectGroup = (group) => {
    setActiveGroup(group);
    setShowAdminView(false);
    setMobileScreen('chat');

    setUnreadCounts(prev => ({
      ...prev,
      [group.id]: 0
    }));
  };

  const handleGroupCreated = (newGroup) => {
    setGroups(prev => [...prev, newGroup]);
    setActiveGroup(newGroup);
    setShowAdminView(false);
    setMobileScreen('chat');
  };

  const handleAddMemberToGroup = async (groupId, memberEmail) => {
    if (isDemo) {
      addDemoGroupMember(groupId, memberEmail);
      return;
    }

    try {
      const target = groups.find(g => g.id === groupId);
      if (!target) return;
      const currentMembers = target.members || [target.created_by];
      if (!currentMembers.includes(memberEmail)) {
        const updatedMembers = [...currentMembers, memberEmail];
        await supabase.from('groups').update({ members: updatedMembers }).eq('id', groupId);
      }
    } catch (err) {
      console.error("Error adding group member:", err);
    }
  };

  const handleStartDirectChat = async (targetEmail, targetTag) => {
    if (!activeUserEmail || !targetEmail) return;

    const isSelf = activeUserEmail.toLowerCase() === targetEmail.toLowerCase();

    if (isDemo) {
      const directGrp = createOrGetDirectChat(activeUserEmail, targetEmail);
      setGroups(prev => {
        if (prev.some(g => g.id === directGrp.id)) return prev;
        return [...prev, directGrp];
      });
      handleSelectGroup(directGrp);
      return;
    }

    const u1 = activeUserEmail.toLowerCase();
    const u2 = targetEmail.toLowerCase();

    const existing = groups.find(g => 
      g.is_direct && 
      ((g.participant1?.toLowerCase() === u1 && g.participant2?.toLowerCase() === u2) ||
       (g.participant1?.toLowerCase() === u2 && g.participant2?.toLowerCase() === u1))
    );

    if (existing) {
      handleSelectGroup(existing);
      return;
    }

    try {
      const targetName = isSelf ? `${activeUserEmail.split('@')[0]} (You)` : (targetEmail.includes('@') ? targetEmail.split('@')[0] : targetEmail);
      const { data, error } = await supabase
        .from('groups')
        .insert({
          name: isSelf ? targetName : `@${targetName}`,
          description: isSelf ? `Message yourself • Personal notes` : `Direct private conversation`,
          is_direct: true,
          participant1: activeUserEmail,
          participant2: targetEmail,
          created_by: activeUserEmail
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setGroups(prev => [...prev, data]);
        handleSelectGroup(data);
      }
    } catch (err) {
      console.error("Error creating direct chat:", err);
      alert("Error starting direct chat: " + (err.message || "Failed"));
    }
  };

  const handleDeleteChat = async (group) => {
    if (!group) return;

    if (isDemo) {
      deleteDemoGroup(group.id);
      setGroups(prev => prev.filter(g => g.id !== group.id));
      if (activeGroup?.id === group.id) {
        const remaining = groups.filter(g => g.id !== group.id);
        setActiveGroup(remaining[0] || null);
      }
      return;
    }

    try {
      const { error } = await supabase.from('groups').delete().eq('id', group.id);
      if (error) throw error;

      setGroups(prev => prev.filter(g => g.id !== group.id));
      if (activeGroup?.id === group.id) {
        const remaining = groups.filter(g => g.id !== group.id);
        setActiveGroup(remaining[0] || null);
      }
    } catch (err) {
      console.error("Error deleting chat:", err);
      alert("Error deleting chat: " + err.message);
    }
  };

  const handleClearChat = async (group) => {
    if (!group) return;

    if (isDemo) {
      clearDemoMessages(group.id);
      return;
    }

    try {
      const { error } = await supabase.from('messages').delete().eq('group_id', group.id);
      if (error) throw error;
    } catch (err) {
      console.error("Error clearing chat messages:", err);
      alert("Error clearing messages: " + err.message);
    }
  };

  const handleForwardMessage = async (msgToForward, targetGroup) => {
    if (!msgToForward || !targetGroup || !activeUserEmail) return;

    const payload = {
      group_id: targetGroup.id,
      content: msgToForward.content || "",
      email: activeUserEmail,
      media_type: msgToForward.media_type || "text",
      media_url: msgToForward.media_url || null,
      file_name: msgToForward.file_name || null,
      file_size: msgToForward.file_size || null
    };

    if (isDemo) {
      sendDemoMessage(payload);
      return;
    }

    try {
      const { error } = await supabase.from('messages').insert(payload);
      if (error) throw error;
    } catch (err) {
      console.error("Error forwarding message:", err);
      alert("Error forwarding message: " + (err.message || "Failed"));
    }
  };

  const handleDeleteGroupSuccess = (groupId) => {
    setGroups(prev => prev.filter(g => g.id !== groupId));
    if (activeGroup?.id === groupId) {
      const remaining = groups.filter(g => g.id !== groupId);
      setActiveGroup(remaining[0] || null);
    }
  };

  const handleDemoLogin = (email) => {
    setLocalDemoUser(email);
  };

  const handleLogout = async () => {
    if (isDemo) {
      setDemoUser(null);
      setLocalDemoUser(null);
      return;
    }
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="app-container loading-wrapper">
        <div className="loading-box">
          <div className="spinner"></div>
          <p>Connecting to WhatsApp...</p>
        </div>
      </div>
    );
  }

  const activeSession = session || (demoUser ? { user: { email: demoUser } } : null);

  if (!activeSession) {
    return (
      <div className="app-container login-layout">
        <div className="login-wrapper-card">
          <Login onDemoLogin={handleDemoLogin} />
        </div>
      </div>
    );
  }

  // Filter visible chats
  const visibleGroups = groups.filter(g => {
    if (isAdmin) return true;
    if (!g.is_direct) return true;
    const myEmail = activeUserEmail?.toLowerCase();
    return g.participant1?.toLowerCase() === myEmail || g.participant2?.toLowerCase() === myEmail;
  });

  return (
    <div className={`app-container main-whatsapp-layout ${isDarkMode ? 'dark-theme' : 'light-theme'}`}>
      {/* Background Top Strip */}
      <div className="whatsapp-top-bar"></div>

      {/* Main WhatsApp Window */}
      <div className={`whatsapp-window ${mobileScreen === 'chat' ? 'mobile-chat-active' : 'mobile-sidebar-active'}`}>
        {/* Left Side Panel */}
        <Sidebar 
          groups={visibleGroups}
          activeGroupId={activeGroup?.id}
          unreadCounts={unreadCounts}
          pinnedGroupIds={pinnedGroupIds}
          onTogglePinChat={handleTogglePinChat}
          onSelectGroup={handleSelectGroup}
          session={activeSession}
          userProfile={userProfile}
          onUpdateProfile={handleUpdateProfile}
          isDemo={isDemo}
          isAdmin={isAdmin}
          showAdminView={showAdminView && isAdmin}
          onToggleAdminView={() => isAdmin && setShowAdminView(!showAdminView)}
          onLogout={handleLogout}
          onGroupCreated={handleGroupCreated}
          onStartDirectChat={handleStartDirectChat}
          onDeleteChat={handleDeleteChat}
          onClearChat={handleClearChat}
          onToggleTheme={() => setIsDarkMode(!isDarkMode)}
          isDarkMode={isDarkMode}
          typingGroupMap={typingGroupMap}
          allKnownUsers={allKnownUsers}
        />

        {/* Right Panel: Chat or Admin Dashboard */}
        <main className="main-content-pane">
          {showAdminView && isAdmin ? (
            <AdminPanel 
              session={activeSession}
              isDemo={isDemo}
              groups={groups}
              onSelectGroup={handleSelectGroup}
              onDeleteGroupSuccess={handleDeleteGroupSuccess}
            />
          ) : (
            <Messages 
              session={activeSession}
              userProfile={userProfile}
              isDemo={isDemo}
              activeGroup={activeGroup}
              groups={visibleGroups}
              onBackToSidebar={() => {
                setActiveGroup(null);
                setMobileScreen('sidebar');
              }}
              isAdmin={isAdmin}
              showAdminView={showAdminView && isAdmin}
              onToggleAdminView={() => isAdmin && setShowAdminView(true)}
              onLogout={handleLogout}
              onStartDirectChat={handleStartDirectChat}
              onForwardMessage={handleForwardMessage}
              onDeleteChat={handleDeleteChat}
              onClearChat={handleClearChat}
              onToggleTheme={() => setIsDarkMode(!isDarkMode)}
              isDarkMode={isDarkMode}
              typingUser={activeGroup ? typingGroupMap[activeGroup.id] : null}
              onBroadcastTyping={handleBroadcastTyping}
              userProfilesMap={userProfilesMap}
              onAddMemberToGroup={handleAddMemberToGroup}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
