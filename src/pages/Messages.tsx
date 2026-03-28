import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Send, User, Circle, Paperclip, Image as ImageIcon, FileText, X, Download,
  Check, CheckCheck, Users, Plus, Search, UserPlus, UserCheck, UserX,
  MessageSquare, Settings, LogOut as LeaveIcon, ChevronLeft, Smile,
  Reply, Shield, Crown, Trash2, UserMinus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import CreateGroupDialog from "@/components/CreateGroupDialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger
} from "@/components/ui/popover";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean | null;
  attachment_url: string | null;
  attachment_type: string | null;
  attachment_name: string | null;
  reply_to_id: string | null;
}

interface Conversation {
  userId: string;
  name: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
  avatarUrl: string | null;
  isGroup?: boolean;
  groupId?: string;
}

interface Profile {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  college: string | null;
}

interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  profile?: Profile;
}

interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  created_at: string;
  profile?: Profile;
}

interface GroupMemberInfo {
  user_id: string;
  role: string;
  profile: Profile;
}

interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
}

type SidebarTab = "chats" | "following" | "requests" | "find";

const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "👍", "🔥"];

const Messages = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [typing, setTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachmentPreview, setAttachmentPreview] = useState<{ file: File; previewUrl?: string; type: string } | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [groupMessages, setGroupMessages] = useState<any[]>([]);
  const [chatMode, setChatMode] = useState<"dm" | "group">("dm");
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("chats");
  const [senderNames, setSenderNames] = useState<Record<string, string>>({});

  // Follow system state (Instagram-style)
  const [following, setFollowing] = useState<Friendship[]>([]);
  const [followers, setFollowers] = useState<Friendship[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);

  // Group management
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);
  const [groupMembersInfo, setGroupMembersInfo] = useState<GroupMemberInfo[]>([]);
  const [currentGroupCreator, setCurrentGroupCreator] = useState<string | null>(null);

  // Reply
  const [replyingTo, setReplyingTo] = useState<{ id: string; content: string; senderName: string } | null>(null);

  // Reactions
  const [reactions, setReactions] = useState<Record<string, Reaction[]>>({});

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeChatRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);

  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages, groupMessages, scrollToBottom]);

  useEffect(() => {
    if (user) {
      fetchFollowing();
      fetchRequests();
      fetchConversations();

      const channel = supabase
        .channel("messages-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, (payload) => {
          if (payload.eventType === "INSERT") {
            const msg = payload.new as Message;
            if (msg.sender_id === user.id || msg.receiver_id === user.id) {
              const currentActive = activeChatRef.current;
              if (currentActive && (msg.sender_id === currentActive || msg.receiver_id === currentActive)) {
                setMessages((prev) => [...prev, msg]);
                if (msg.receiver_id === user.id) {
                  supabase.from("messages").update({ read: true }).eq("id", msg.id).then();
                }
              }
              fetchConversations();
            }
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Message;
            setMessages((prev) => prev.map((m) => m.id === updated.id ? updated : m));
          }
        })
        .subscribe();

      const presenceChannel = supabase.channel("presence-chat", { config: { presence: { key: user.id } } });
      presenceChannel
        .on("presence", { event: "sync" }, () => {})
        .on("broadcast", { event: "typing" }, (payload) => {
          if (payload.payload?.userId !== user.id && payload.payload?.to === user.id) {
            setOtherTyping(true);
            setTimeout(() => setOtherTyping(false), 2000);
          }
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") await presenceChannel.track({ online: true });
        });

      const groupChannel = supabase
        .channel("group-messages-realtime")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_messages" }, (payload) => {
          const msg = payload.new as any;
          if (activeChatRef.current === `group:${msg.group_id}`) {
            setGroupMessages((prev) => [...prev, msg]);
          }
          fetchConversations();
        })
        .subscribe();

      const friendChannel = supabase
        .channel("friend-requests-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "friend_requests" }, () => fetchRequests())
        .subscribe();

      const reactionChannel = supabase
        .channel("reactions-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, () => {
          if (activeChatRef.current) fetchReactionsForChat();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
        supabase.removeChannel(presenceChannel);
        supabase.removeChannel(groupChannel);
        supabase.removeChannel(friendChannel);
        supabase.removeChannel(reactionChannel);
      };
    }
  }, [user]);

  useEffect(() => {
    if (activeChat) {
      if (activeChat.startsWith("group:")) {
        setChatMode("group");
        const groupId = activeChat.replace("group:", "");
        fetchGroupMessages(groupId);
        fetchGroupMembersInfo(groupId);
      } else {
        setChatMode("dm");
        fetchMessages(activeChat);
      }
      fetchReactionsForChat();
    }
  }, [activeChat]);

  // Instagram-style: fetch who YOU follow
  const fetchFollowing = async () => {
    if (!user) return;
    const { data } = await supabase.from("friendships").select("*").eq("user_id", user.id);
    if (!data) return;
    const enriched: Friendship[] = [];
    for (const f of data) {
      const { data: profile } = await supabase.from("profiles").select("user_id, full_name, avatar_url, college").eq("user_id", f.friend_id).single();
      enriched.push({ ...f, profile: profile || undefined } as Friendship);
    }
    setFollowing(enriched);

    // Also fetch followers
    const { data: followerData } = await supabase.from("friendships").select("*").eq("friend_id", user.id);
    if (followerData) {
      const enrichedFollowers: Friendship[] = [];
      for (const f of followerData) {
        const { data: profile } = await supabase.from("profiles").select("user_id, full_name, avatar_url, college").eq("user_id", f.user_id).single();
        enrichedFollowers.push({ ...f, profile: profile || undefined } as Friendship);
      }
      setFollowers(enrichedFollowers);
    }
  };

  const fetchRequests = async () => {
    if (!user) return;
    const { data: incoming } = await supabase.from("friend_requests").select("*").eq("receiver_id", user.id).eq("status", "pending");
    if (incoming) {
      const enriched = await Promise.all(
        incoming.map(async (r: any) => {
          const { data: profile } = await supabase.from("profiles").select("user_id, full_name, avatar_url, college").eq("user_id", r.sender_id).single();
          return { ...r, profile: profile || undefined } as FriendRequest;
        })
      );
      setIncomingRequests(enriched);
    }
    const { data: sent } = await supabase.from("friend_requests").select("*").eq("sender_id", user.id).eq("status", "pending");
    if (sent) setSentRequests(sent as FriendRequest[]);
  };

  const fetchConversations = async () => {
    if (!user) return;
    const { data } = await supabase.from("messages").select("*").or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`).order("created_at", { ascending: false });
    if (!data) return;

    const convMap = new Map<string, { msgs: Message[] }>();
    (data as Message[]).forEach((msg) => {
      const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      if (!convMap.has(otherId)) convMap.set(otherId, { msgs: [] });
      convMap.get(otherId)!.msgs.push(msg);
    });

    const convs: Conversation[] = [];
    for (const [userId, { msgs }] of convMap) {
      const { data: profile } = await supabase.from("profiles").select("full_name, avatar_url").eq("user_id", userId).single();
      const unread = msgs.filter((m) => m.receiver_id === user.id && !m.read).length;
      const lastMsg = msgs[0];
      let lastText = lastMsg.content;
      if (lastMsg.attachment_type === "image") lastText = "📷 Photo";
      else if (lastMsg.attachment_type === "file") lastText = `📎 ${lastMsg.attachment_name || "File"}`;
      convs.push({ userId, name: profile?.full_name || "Anonymous", avatarUrl: profile?.avatar_url || null, lastMessage: lastText, lastTime: new Date(lastMsg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), unread });
    }

    const { data: memberData } = await supabase.from("group_members").select("group_id").eq("user_id", user.id);
    if (memberData) {
      for (const gm of memberData) {
        const { data: group } = await supabase.from("group_chats").select("*").eq("id", gm.group_id).single();
        if (!group) continue;
        const { data: lastGMsg } = await supabase.from("group_messages").select("*").eq("group_id", gm.group_id).order("created_at", { ascending: false }).limit(1);
        const lastMsg = lastGMsg?.[0];
        convs.push({
          userId: `group:${group.id}`, groupId: group.id, name: group.name,
          avatarUrl: group.avatar_url || null, lastMessage: lastMsg?.content || "No messages yet",
          lastTime: lastMsg ? new Date(lastMsg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
          unread: 0, isGroup: true,
        });
      }
    }
    setConversations(convs);
    if (convs.length > 0 && !activeChatRef.current) setActiveChat(convs[0].userId);
  };

  const fetchGroupMessages = async (groupId: string) => {
    const { data } = await supabase.from("group_messages").select("*").eq("group_id", groupId).order("created_at", { ascending: true });
    if (data) {
      setGroupMessages(data);
      const senderIds = [...new Set(data.map((m: any) => m.sender_id))];
      const names: Record<string, string> = {};
      for (const sid of senderIds) {
        if (sid === user?.id) { names[sid] = "You"; continue; }
        const { data: p } = await supabase.from("profiles").select("full_name").eq("user_id", sid).single();
        names[sid] = p?.full_name || "Anonymous";
      }
      setSenderNames(names);
    }
  };

  const fetchGroupMembersInfo = async (groupId: string) => {
    const { data } = await supabase.from("group_members").select("user_id, role").eq("group_id", groupId);
    if (!data) return;
    const { data: groupData } = await supabase.from("group_chats").select("created_by").eq("id", groupId).single();
    setCurrentGroupCreator(groupData?.created_by || null);
    const members: GroupMemberInfo[] = [];
    for (const m of data) {
      const { data: p } = await supabase.from("profiles").select("user_id, full_name, avatar_url, college").eq("user_id", m.user_id).single();
      if (p) members.push({ user_id: m.user_id, role: m.role, profile: p as Profile });
    }
    setGroupMembersInfo(members);
  };

  const fetchMessages = async (otherUserId: string) => {
    if (!user) return;
    const { data } = await supabase.from("messages").select("*").or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`).order("created_at", { ascending: true });
    if (data) setMessages(data as Message[]);
    await supabase.from("messages").update({ read: true }).eq("receiver_id", user.id).eq("sender_id", otherUserId).eq("read", false);
  };

  const fetchReactionsForChat = async () => {
    if (!user) return;
    const currentMsgs = chatMode === "dm" ? messages : groupMessages;
    const msgIds = currentMsgs.map((m) => m.id);
    if (msgIds.length === 0) return;
    const { data } = await supabase.from("message_reactions").select("*").in("message_id", msgIds);
    if (data) {
      const grouped: Record<string, Reaction[]> = {};
      data.forEach((r: any) => {
        if (!grouped[r.message_id]) grouped[r.message_id] = [];
        grouped[r.message_id].push(r as Reaction);
      });
      setReactions(grouped);
    }
  };

  // Re-fetch reactions when messages change
  useEffect(() => {
    if (activeChat && (messages.length > 0 || groupMessages.length > 0)) {
      fetchReactionsForChat();
    }
  }, [messages.length, groupMessages.length]);

  // Follow actions (Instagram-style)
  const handleSearch = async () => {
    if (!searchQuery.trim() || !user) return;
    setSearching(true);
    const { data } = await supabase.from("profiles").select("user_id, full_name, avatar_url, college").neq("user_id", user.id).ilike("full_name", `%${searchQuery}%`).limit(20);
    setSearchResults((data as Profile[]) || []);
    setSearching(false);
  };

  const sendFollowRequest = async (receiverId: string) => {
    if (!user || receiverId === user.id) return;
    const { error } = await supabase.from("friend_requests").insert({ sender_id: user.id, receiver_id: receiverId });
    if (error) {
      if (error.code === "23505") toast({ title: "Already sent" });
      else toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Follow request sent! 🎉" });
      fetchRequests();
    }
  };

  const acceptRequest = async (requestId: string, senderId: string) => {
    if (!user) return;
    await supabase.from("friend_requests").update({ status: "accepted" }).eq("id", requestId);
    // Instagram-style: only the sender follows the receiver (one-way)
    await supabase.from("friendships").insert({ user_id: senderId, friend_id: user.id });
    toast({ title: "Request accepted! They now follow you." });
    fetchFollowing();
    fetchRequests();
  };

  const rejectRequest = async (requestId: string) => {
    await supabase.from("friend_requests").update({ status: "rejected" }).eq("id", requestId);
    toast({ title: "Request declined" });
    fetchRequests();
  };

  // Unfollow: only removes YOUR follow (one-way, Instagram-style)
  const unfollowUser = async (targetUserId: string) => {
    if (!user) return;
    await supabase.from("friendships").delete().eq("user_id", user.id).eq("friend_id", targetUserId);
    toast({ title: "Unfollowed" });
    fetchFollowing();
  };

  const isFollowing = (userId: string) => following.some(f => f.friend_id === userId);
  const hasSentRequest = (userId: string) => sentRequests.some(r => r.receiver_id === userId);

  const messagePerson = (userId: string) => {
    setActiveChat(userId);
    setSidebarTab("chats");
    setShowSidebar(false);
  };

  // Group admin actions
  const removeMember = async (groupId: string, memberId: string) => {
    await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", memberId);
    toast({ title: "Member removed" });
    fetchGroupMembersInfo(groupId);
    fetchConversations();
  };

  const promoteMember = async (groupId: string, memberId: string) => {
    await supabase.from("group_members").update({ role: "admin" }).eq("group_id", groupId).eq("user_id", memberId);
    toast({ title: "Promoted to admin" });
    fetchGroupMembersInfo(groupId);
  };

  const demoteMember = async (groupId: string, memberId: string) => {
    await supabase.from("group_members").update({ role: "member" }).eq("group_id", groupId).eq("user_id", memberId);
    toast({ title: "Demoted to member" });
    fetchGroupMembersInfo(groupId);
  };

  const leaveGroup = async () => {
    if (!user || !activeChat?.startsWith("group:")) return;
    const groupId = activeChat.replace("group:", "");
    await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", user.id);
    toast({ title: "Left group" });
    setActiveChat(null);
    setGroupInfoOpen(false);
    fetchConversations();
  };

  // Reactions
  const addReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    const existing = reactions[messageId]?.find(r => r.user_id === user.id && r.emoji === emoji);
    if (existing) {
      await supabase.from("message_reactions").delete().eq("id", existing.id);
    } else {
      await supabase.from("message_reactions").insert({
        message_id: messageId, user_id: user.id, emoji,
        message_type: chatMode === "dm" ? "dm" : "group",
      });
    }
    fetchReactionsForChat();
  };

  // Reply
  const startReply = (msgId: string, content: string, senderName: string) => {
    setReplyingTo({ id: msgId, content: content.substring(0, 60), senderName });
  };

  // Typing
  const handleTyping = useCallback(() => {
    if (!user || !activeChat) return;
    supabase.channel("presence-chat").send({ type: "broadcast", event: "typing", payload: { userId: user.id, to: activeChat } });
  }, [user, activeChat]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMsg(e.target.value);
    if (!typing) { setTyping(true); handleTyping(); }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setTyping(false), 1500);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "file") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview: { file: File; previewUrl?: string; type: string } = { file, type };
    if (type === "image") {
      const reader = new FileReader();
      reader.onload = () => { preview.previewUrl = reader.result as string; setAttachmentPreview(preview); };
      reader.readAsDataURL(file);
    } else {
      setAttachmentPreview(preview);
    }
    e.target.value = "";
  };

  const clearAttachment = () => setAttachmentPreview(null);

  const uploadAttachment = async (chatPath: string) => {
    if (!attachmentPreview) return { url: null, type: null, name: null };
    setUploading(true);
    const file = attachmentPreview.file;
    const ext = file.name.split(".").pop();
    const bucket = attachmentPreview.type === "image" ? "resource-images" : "resource-files";
    const filePath = `${chatPath}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(filePath, file);
    setUploading(false);
    if (error) return { url: null, type: null, name: null };
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return { url: urlData.publicUrl, type: attachmentPreview.type, name: file.name };
  };

  const handleSend = async () => {
    if ((!newMsg.trim() && !attachmentPreview) || !user || !activeChat) return;

    if (activeChat.startsWith("group:")) {
      const groupId = activeChat.replace("group:", "");
      const att = await uploadAttachment(`group/${groupId}`);
      await supabase.from("group_messages").insert({
        group_id: groupId, sender_id: user.id,
        content: newMsg.trim() || (att.type === "image" ? "📷 Photo" : `📎 ${att.name}`),
        attachment_url: att.url, attachment_type: att.type, attachment_name: att.name,
        reply_to_id: replyingTo?.id || null,
      });
    } else {
      const att = await uploadAttachment(`chat/${user.id}`);
      await supabase.from("messages").insert({
        sender_id: user.id, receiver_id: activeChat,
        content: newMsg.trim() || (att.type === "image" ? "📷 Photo" : `📎 ${att.name}`),
        attachment_url: att.url, attachment_type: att.type, attachment_name: att.name,
        reply_to_id: replyingTo?.id || null,
      });
    }
    setNewMsg("");
    setAttachmentPreview(null);
    setReplyingTo(null);
  };

  const activeConv = conversations.find((c) => c.userId === activeChat);
  const activeName = activeConv?.name || "";
  const activeAvatar = activeConv?.avatarUrl;
  const isGroupChat = activeConv?.isGroup;

  const isCurrentUserAdmin = () => {
    if (!activeChat?.startsWith("group:") || !user) return false;
    const member = groupMembersInfo.find(m => m.user_id === user.id);
    return member?.role === "admin" || currentGroupCreator === user.id;
  };

  const renderTicks = (m: Message) => {
    if (m.sender_id !== user?.id) return null;
    if (m.read) return <CheckCheck className="h-3.5 w-3.5 text-blue-400 inline-block ml-1" />;
    return <Check className="h-3.5 w-3.5 text-white/60 inline-block ml-1" />;
  };

  const findReplyMessage = (replyId: string | null) => {
    if (!replyId) return null;
    return chatMode === "dm"
      ? messages.find(m => m.id === replyId)
      : groupMessages.find(m => m.id === replyId);
  };

  const renderReactions = (msgId: string) => {
    const msgReactions = reactions[msgId];
    if (!msgReactions || msgReactions.length === 0) return null;
    const emojiCounts: Record<string, { count: number; userReacted: boolean }> = {};
    msgReactions.forEach(r => {
      if (!emojiCounts[r.emoji]) emojiCounts[r.emoji] = { count: 0, userReacted: false };
      emojiCounts[r.emoji].count++;
      if (r.user_id === user?.id) emojiCounts[r.emoji].userReacted = true;
    });
    return (
      <div className="flex gap-1 mt-1">
        {Object.entries(emojiCounts).map(([emoji, { count, userReacted }]) => (
          <button
            key={emoji}
            onClick={() => addReaction(msgId, emoji)}
            className={`text-xs px-1.5 py-0.5 rounded-full border transition-colors ${
              userReacted ? "border-primary bg-primary/10" : "border-border/50 bg-card/80 hover:border-primary/50"
            }`}
          >
            {emoji} {count > 1 && <span className="text-[10px]">{count}</span>}
          </button>
        ))}
      </div>
    );
  };

  const renderMessageBubble = (m: any, isMine: boolean, isGroup: boolean) => {
    const replyMsg = findReplyMessage(m.reply_to_id);
    const sName = isGroup && !isMine ? (senderNames[m.sender_id] || "...") : null;

    return (
      <div className={`flex ${isMine ? "justify-end" : "justify-start"} group/msg`}>
        <div className="max-w-[78%]">
          <div className={`overflow-hidden rounded-2xl px-4 py-2 text-sm shadow-sm ${
            isMine ? "bg-gradient-primary text-white" : "bg-muted text-foreground"
          }`}>
            {sName && <p className="text-xs font-semibold mb-1 text-primary">{sName}</p>}

            {/* Reply preview */}
            {replyMsg && (
              <div className={`text-xs mb-1.5 px-2 py-1 rounded-lg border-l-2 ${
                isMine ? "bg-white/15 border-white/40" : "bg-background/50 border-primary/40"
              }`}>
                <p className="opacity-70 truncate">{replyMsg.content}</p>
              </div>
            )}

            {m.attachment_type === "image" && m.attachment_url && (
              <a href={m.attachment_url} target="_blank" rel="noopener noreferrer">
                <img src={m.attachment_url} alt="Shared" className="rounded-xl max-w-[240px] max-h-[200px] object-cover mb-1" />
              </a>
            )}
            {m.attachment_type === "file" && m.attachment_url && (
              <a href={m.attachment_url} target="_blank" rel="noopener noreferrer"
                className={`flex items-center gap-2 rounded-xl px-3 py-2 mb-1 ${isMine ? "bg-white/20" : "bg-background/50"}`}>
                <FileText className="h-4 w-4 shrink-0" />
                <span className="text-xs truncate max-w-[150px]">{m.attachment_name || "File"}</span>
                <Download className="h-3 w-3 shrink-0" />
              </a>
            )}
            {m.content && !(m.attachment_type && (m.content === "📷 Photo" || m.content.startsWith("📎"))) && (
              <p className="break-words whitespace-pre-wrap leading-relaxed">{m.content}</p>
            )}
            <div className={`flex items-center justify-end gap-0.5 mt-1 ${isMine ? "text-white/60" : "text-muted-foreground"}`}>
              <span className="text-[10px]">{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              {!isGroup && renderTicks(m)}
            </div>
          </div>

          {/* Reactions */}
          {renderReactions(m.id)}

          {/* Action buttons (visible on hover) */}
          <div className={`flex gap-1 mt-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity ${isMine ? "justify-end" : "justify-start"}`}>
            <Popover>
              <PopoverTrigger asChild>
                <button className="p-1 rounded-full hover:bg-muted text-muted-foreground"><Smile className="h-3 w-3" /></button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2 flex gap-1" side="top">
                {REACTION_EMOJIS.map(emoji => (
                  <button key={emoji} onClick={() => addReaction(m.id, emoji)} className="text-lg hover:scale-125 transition-transform p-0.5">{emoji}</button>
                ))}
              </PopoverContent>
            </Popover>
            <button
              className="p-1 rounded-full hover:bg-muted text-muted-foreground"
              onClick={() => startReply(m.id, m.content, sName || (isMine ? "You" : activeName))}
            >
              <Reply className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const Avatar = ({ url, name, size = "h-10 w-10" }: { url: string | null; name: string | null; size?: string }) => (
    url ? (
      <img src={url} alt="" className={`${size} rounded-full object-cover`} />
    ) : (
      <div className={`${size} rounded-full bg-gradient-primary flex items-center justify-center shrink-0`}>
        <span className="text-white font-bold text-sm">{(name || "?")[0].toUpperCase()}</span>
      </div>
    )
  );

  const renderSidebarContent = () => {
    if (sidebarTab === "chats") {
      return (
        <div className="min-h-0 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">No conversations yet. Follow people to start chatting!</div>
          ) : (
            conversations.map((c) => (
              <button key={c.userId} className={`w-full p-3 text-left flex items-center gap-3 hover:bg-muted/50 transition-colors ${activeChat === c.userId ? "bg-muted/50" : ""}`} onClick={() => { setActiveChat(c.userId); setShowSidebar(false); }}>
                <div className="relative">
                  {c.isGroup ? (
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0"><Users className="h-5 w-5 text-white" /></div>
                  ) : (
                    <Avatar url={c.avatarUrl} name={c.name} />
                  )}
                  {!c.isGroup && <Circle className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 text-primary fill-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm truncate">{c.name}{c.isGroup ? " 👥" : ""}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{c.lastTime}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{c.lastMessage}</p>
                </div>
                {c.unread > 0 && <span className="h-5 w-5 rounded-full bg-gradient-primary text-white text-xs flex items-center justify-center shrink-0">{c.unread}</span>}
              </button>
            ))
          )}
        </div>
      );
    }

    if (sidebarTab === "following") {
      return (
        <div className="min-h-0 overflow-y-auto p-2 space-y-1">
          <p className="text-xs font-medium text-muted-foreground px-2 mb-1">Following ({following.length})</p>
          {following.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm"><Users className="h-8 w-8 mx-auto mb-2 opacity-40" /><p>Not following anyone</p></div>
          ) : (
            following.map((f) => (
              <div key={f.id} className="flex items-center gap-2 p-2 rounded-xl hover:bg-muted/50">
                <Avatar url={f.profile?.avatar_url || null} name={f.profile?.full_name || null} size="h-9 w-9" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{f.profile?.full_name || "Anonymous"}</p>
                  {f.profile?.college && <p className="text-xs text-muted-foreground truncate">{f.profile.college}</p>}
                </div>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => messagePerson(f.friend_id)}><MessageSquare className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => unfollowUser(f.friend_id)}><UserMinus className="h-3.5 w-3.5" /></Button>
              </div>
            ))
          )}
          {followers.length > 0 && (
            <>
              <p className="text-xs font-medium text-muted-foreground px-2 mt-3 mb-1">Followers ({followers.length})</p>
              {followers.map((f) => (
                <div key={f.id} className="flex items-center gap-2 p-2 rounded-xl hover:bg-muted/50">
                  <Avatar url={f.profile?.avatar_url || null} name={f.profile?.full_name || null} size="h-9 w-9" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{f.profile?.full_name || "Anonymous"}</p>
                  </div>
                  {!isFollowing(f.user_id) && (
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={() => sendFollowRequest(f.user_id)}>
                      <UserPlus className="h-3 w-3" /> Follow back
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => messagePerson(f.user_id)}><MessageSquare className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
            </>
          )}
        </div>
      );
    }

    if (sidebarTab === "requests") {
      return (
        <div className="min-h-0 overflow-y-auto p-2 space-y-1">
          {incomingRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No pending requests</p>
          ) : (
            incomingRequests.map((r) => (
              <div key={r.id} className="flex items-center gap-2 p-2 rounded-xl hover:bg-muted/50">
                <Avatar url={r.profile?.avatar_url || null} name={r.profile?.full_name || null} size="h-9 w-9" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{r.profile?.full_name || "Anonymous"}</p>
                  <p className="text-xs text-muted-foreground">Wants to follow you</p>
                </div>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-primary" onClick={() => acceptRequest(r.id, r.sender_id)}><UserCheck className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => rejectRequest(r.id)}><UserX className="h-3.5 w-3.5" /></Button>
              </div>
            ))
          )}
        </div>
      );
    }

    // Find tab
    return (
      <div className="min-h-0 overflow-y-auto p-2 space-y-2">
        <div className="flex gap-1">
          <Input placeholder="Search by name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} className="rounded-full text-sm h-8" />
          <Button onClick={handleSearch} size="sm" className="bg-gradient-primary text-white rounded-full h-8 w-8 p-0" disabled={searching}><Search className="h-3.5 w-3.5" /></Button>
        </div>
        {searchResults.map((p) => (
          <div key={p.user_id} className="flex items-center gap-2 p-2 rounded-xl hover:bg-muted/50">
            <Avatar url={p.avatar_url} name={p.full_name} size="h-9 w-9" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{p.full_name || "Anonymous"}</p>
              {p.college && <p className="text-xs text-muted-foreground truncate">{p.college}</p>}
            </div>
            {isFollowing(p.user_id) ? (
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => unfollowUser(p.user_id)}>Unfollow</Button>
            ) : hasSentRequest(p.user_id) ? (
              <Badge variant="outline" className="text-xs">Pending</Badge>
            ) : (
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => sendFollowRequest(p.user_id)}><UserPlus className="h-3 w-3" /> Follow</Button>
            )}
          </div>
        ))}
        {searchResults.length === 0 && searchQuery && !searching && <p className="text-center text-xs text-muted-foreground py-4">No users found</p>}
      </div>
    );
  };

  return (
    <div className="min-h-screen pt-16 px-4 pb-8">
      <div className="container mx-auto max-w-5xl pt-4">
        <div className="flex items-center justify-between mb-4">
          <motion.h1 className="font-heading text-3xl font-bold" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="text-gradient">Messages</span>
          </motion.h1>
          <CreateGroupDialog onGroupCreated={fetchConversations} />
        </div>

        <div className="bg-card rounded-2xl overflow-hidden grid md:grid-cols-[280px_1fr] h-[70vh] min-h-0 shadow-soft border border-border/50">
          {/* Sidebar */}
          <div className={`border-r border-border/50 flex flex-col min-h-0 ${activeChat && !showSidebar ? "hidden md:flex" : ""}`}>
            <div className="flex border-b border-border/50 shrink-0">
              {([
                { key: "chats" as const, icon: MessageSquare, label: "Chats" },
                { key: "following" as const, icon: Users, label: "Following", count: following.length },
                { key: "requests" as const, icon: UserCheck, label: "Requests", count: incomingRequests.length },
                { key: "find" as const, icon: Search, label: "Find" },
              ]).map((t) => (
                <button key={t.key} onClick={() => setSidebarTab(t.key)} className={`flex-1 py-2.5 text-xs font-medium flex flex-col items-center gap-0.5 transition-colors relative ${sidebarTab === t.key ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                  <div className="relative">
                    <t.icon className="h-4 w-4" />
                    {t.count !== undefined && t.count > 0 && <span className="absolute -top-1.5 -right-2.5 h-4 w-4 rounded-full bg-gradient-primary text-white text-[10px] flex items-center justify-center">{t.count}</span>}
                  </div>
                  {t.label}
                  {sidebarTab === t.key && <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-full" />}
                </button>
              ))}
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">{renderSidebarContent()}</div>
          </div>

          {/* Chat area */}
          <div className="flex min-h-0 flex-col">
            {activeChat ? (
              <>
                {/* Header */}
                <div className="px-4 py-3 border-b border-border/50 flex items-center gap-3">
                  <button className="md:hidden text-muted-foreground" onClick={() => setShowSidebar(true)}><ChevronLeft className="h-5 w-5" /></button>
                  <div className="relative">
                    {isGroupChat ? (
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"><Users className="h-4 w-4 text-white" /></div>
                    ) : activeAvatar ? (
                      <img src={activeAvatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center"><User className="h-4 w-4 text-white" /></div>
                    )}
                    {!isGroupChat && <Circle className="absolute -bottom-0.5 -right-0.5 h-3 w-3 text-primary fill-primary" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{activeName}{isGroupChat ? " 👥" : ""}</p>
                    {otherTyping ? <p className="text-xs text-primary animate-pulse">typing...</p> : isGroupChat ? <p className="text-xs text-muted-foreground">{groupMembersInfo.length} members</p> : <p className="text-xs text-primary">online</p>}
                  </div>
                  {isGroupChat && (
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setGroupInfoOpen(true)}><Settings className="h-4 w-4" /></Button>
                  )}
                </div>

                {/* Messages */}
                <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-4">
                  <div className="flex min-h-full flex-col justify-end">
                    <div className="space-y-3">
                      {chatMode === "dm"
                        ? messages.map((m) => renderMessageBubble(m, m.sender_id === user?.id, false))
                        : groupMessages.map((m) => renderMessageBubble(m, m.sender_id === user?.id, true))
                      }
                      {otherTyping && (
                        <div className="flex justify-start">
                          <div className="bg-muted rounded-2xl px-4 py-2 text-sm text-muted-foreground">
                            <span className="flex gap-1">
                              <span className="animate-bounce" style={{ animationDelay: "0ms" }}>•</span>
                              <span className="animate-bounce" style={{ animationDelay: "150ms" }}>•</span>
                              <span className="animate-bounce" style={{ animationDelay: "300ms" }}>•</span>
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Reply preview */}
                {replyingTo && (
                  <div className="px-4 py-2 border-t border-border/30 bg-muted/30 flex items-center gap-2">
                    <Reply className="h-4 w-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-primary">{replyingTo.senderName}</p>
                      <p className="text-xs text-muted-foreground truncate">{replyingTo.content}</p>
                    </div>
                    <button onClick={() => setReplyingTo(null)} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
                  </div>
                )}

                {/* Input */}
                <div className="border-t border-border/50">
                  {attachmentPreview && (
                    <div className="px-4 pt-3 flex items-center gap-3">
                      {attachmentPreview.type === "image" && attachmentPreview.previewUrl ? (
                        <img src={attachmentPreview.previewUrl} alt="" className="h-16 w-16 rounded-xl object-cover" />
                      ) : (
                        <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="text-xs truncate max-w-[200px]">{attachmentPreview.file.name}</span>
                        </div>
                      )}
                      <button onClick={clearAttachment} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
                    </div>
                  )}
                  <div className="p-4 flex gap-2 items-center">
                    <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e, "image")} />
                    <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.xlsx,.xls,.zip,.rar" className="hidden" onChange={(e) => handleFileSelect(e, "file")} />
                    <button onClick={() => imageInputRef.current?.click()} className="text-muted-foreground hover:text-primary transition-colors p-1.5 rounded-full hover:bg-muted"><ImageIcon className="h-5 w-5" /></button>
                    <button onClick={() => fileInputRef.current?.click()} className="text-muted-foreground hover:text-primary transition-colors p-1.5 rounded-full hover:bg-muted"><Paperclip className="h-5 w-5" /></button>
                    <Input placeholder="Type a message..." value={newMsg} onChange={handleInputChange} onKeyDown={(e) => e.key === "Enter" && !uploading && handleSend()} className="min-w-0 flex-1 rounded-full" />
                    <Button onClick={handleSend} className="bg-gradient-primary rounded-full text-white" disabled={uploading}>
                      {uploading ? <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Select a conversation or find people to follow</div>
            )}
          </div>
        </div>
      </div>

      {/* Group Info Dialog with Admin Management */}
      <Dialog open={groupInfoOpen} onOpenChange={setGroupInfoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Group Info
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-2">Members ({groupMembersInfo.length})</h4>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {groupMembersInfo.map((m) => {
                  const isCreator = m.user_id === currentGroupCreator;
                  const isAdmin = m.role === "admin" || isCreator;
                  const canManage = isCurrentUserAdmin() && m.user_id !== user?.id;
                  return (
                    <div key={m.user_id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50">
                      <Avatar url={m.profile.avatar_url} name={m.profile.full_name} size="h-8 w-8" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium truncate">{m.profile.full_name || "Anonymous"}</span>
                          {isCreator && <Crown className="h-3 w-3 text-amber-500" />}
                          {isAdmin && !isCreator && <Shield className="h-3 w-3 text-primary" />}
                          {m.user_id === user?.id && <Badge variant="outline" className="text-[10px] py-0">You</Badge>}
                        </div>
                        <span className="text-[10px] text-muted-foreground capitalize">{isCreator ? "creator" : m.role}</span>
                      </div>
                      {canManage && activeChat && (
                        <div className="flex gap-1">
                          {m.role === "member" ? (
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" title="Promote to admin" onClick={() => promoteMember(activeChat.replace("group:", ""), m.user_id)}>
                              <Shield className="h-3 w-3 text-primary" />
                            </Button>
                          ) : !isCreator ? (
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" title="Demote to member" onClick={() => demoteMember(activeChat.replace("group:", ""), m.user_id)}>
                              <UserMinus className="h-3 w-3" />
                            </Button>
                          ) : null}
                          {!isCreator && (
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" title="Remove member" onClick={() => removeMember(activeChat!.replace("group:", ""), m.user_id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <Button variant="destructive" className="w-full gap-2" onClick={leaveGroup}>
              <LeaveIcon className="h-4 w-4" /> Leave Group
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Messages;
