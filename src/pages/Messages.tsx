import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Send, User, Circle, Paperclip, Image as ImageIcon, FileText, X, Download,
  Check, CheckCheck, Users, Plus, Search, MessageSquare, Settings, LogOut as LeaveIcon,
  ChevronLeft, Smile, Reply, Shield, Crown, Trash2, UserMinus, MoreVertical,
  UserX, UserCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import CreateGroupDialog from "@/components/CreateGroupDialog";
import AddGroupMembersDialog from "@/components/AddGroupMembersDialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger
} from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

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
  const [senderNames, setSenderNames] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");

  // Group management
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);
  const [groupMembersInfo, setGroupMembersInfo] = useState<GroupMemberInfo[]>([]);
  const [currentGroupCreator, setCurrentGroupCreator] = useState<string | null>(null);

  // Reply
  const [replyingTo, setReplyingTo] = useState<{ id: string; content: string; senderName: string } | null>(null);

  // Reactions
  const [reactions, setReactions] = useState<Record<string, Reaction[]>>({});

  // Delete chat
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Follow state for DM
  const [isFollowing, setIsFollowing] = useState(false);

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
        checkFollowStatus(activeChat);
      }
      fetchReactionsForChat();
    }
  }, [activeChat]);

  const checkFollowStatus = async (otherUserId: string) => {
    if (!user) return;
    const { data } = await supabase.from("friendships").select("id").or(`and(user_id.eq.${user.id},friend_id.eq.${otherUserId}),and(user_id.eq.${otherUserId},friend_id.eq.${user.id})`).limit(1);
    setIsFollowing(!!data && data.length > 0);
  };

  const toggleFollow = async () => {
    if (!user || !activeChat || activeChat.startsWith("group:")) return;
    if (isFollowing) {
      await supabase.from("friendships").delete().or(`and(user_id.eq.${user.id},friend_id.eq.${activeChat}),and(user_id.eq.${activeChat},friend_id.eq.${user.id})`);
      setIsFollowing(false);
      toast({ title: "Unfollowed" });
    } else {
      await supabase.from("friendships").insert({ user_id: user.id, friend_id: activeChat });
      setIsFollowing(true);
      toast({ title: "Following!" });
    }
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

  useEffect(() => {
    if (activeChat && (messages.length > 0 || groupMessages.length > 0)) {
      fetchReactionsForChat();
    }
  }, [messages.length, groupMessages.length]);

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

  const deleteChat = async (chatUserId: string) => {
    if (!user) return;
    await supabase.from("messages").delete().eq("sender_id", user.id).eq("receiver_id", chatUserId);
    await supabase.from("messages").delete().eq("sender_id", chatUserId).eq("receiver_id", user.id);
    toast({ title: "Chat deleted" });
    if (activeChat === chatUserId) {
      setActiveChat(null);
      setMessages([]);
    }
    setDeleteTarget(null);
    fetchConversations();
  };

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

  const startReply = (msgId: string, content: string, senderName: string) => {
    setReplyingTo({ id: msgId, content: content.substring(0, 60), senderName });
  };

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
    if (bucket === "resource-files") {
      return { url: filePath, type: attachmentPreview.type, name: file.name };
    }
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !uploading) {
      e.preventDefault();
      handleSend();
    }
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
    if (m.read) return <CheckCheck className="h-3.5 w-3.5 text-sky-400 inline-block ml-1" />;
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

  // Date separator helper
  const getDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === now.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  };

  const renderMessageBubble = (m: any, isMine: boolean, isGroup: boolean) => {
    const replyMsg = findReplyMessage(m.reply_to_id);
    const sName = isGroup && !isMine ? (senderNames[m.sender_id] || "...") : null;

    return (
      <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"} group/msg`}>
        <div className="max-w-[78%]">
          <div className={`overflow-hidden rounded-2xl px-4 py-2 text-sm shadow-sm ${
            isMine
              ? "bg-[hsl(var(--wa-sent))] text-white"
              : "bg-white text-foreground border border-border/30"
          }`}>
            {sName && <p className="text-xs font-semibold mb-1 text-primary">{sName}</p>}

            {replyMsg && (
              <div className={`text-xs mb-1.5 px-2 py-1 rounded-lg border-l-2 ${
                isMine ? "bg-white/15 border-white/40" : "bg-muted/50 border-primary/40"
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
                className={`flex items-center gap-2 rounded-xl px-3 py-2 mb-1 ${isMine ? "bg-white/20" : "bg-muted/50"}`}>
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

          {renderReactions(m.id)}

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

  const renderMessagesWithDates = (msgs: any[], isGroup: boolean) => {
    let lastDate = "";
    const elements: React.ReactNode[] = [];
    msgs.forEach((m) => {
      const dateLabel = getDateLabel(m.created_at);
      if (dateLabel !== lastDate) {
        lastDate = dateLabel;
        elements.push(
          <div key={`date-${m.id}`} className="flex justify-center my-3">
            <span className="text-[11px] bg-muted/80 text-muted-foreground px-3 py-1 rounded-full shadow-sm">{dateLabel}</span>
          </div>
        );
      }
      elements.push(renderMessageBubble(m, m.sender_id === user?.id, isGroup));
    });
    return elements;
  };

  const AvatarEl = ({ url, name, size = "h-10 w-10" }: { url: string | null; name: string | null; size?: string }) => (
    url ? (
      <img src={url} alt="" className={`${size} rounded-full object-cover`} />
    ) : (
      <div className={`${size} rounded-full bg-gradient-primary flex items-center justify-center shrink-0`}>
        <span className="text-white font-bold text-sm">{(name || "?")[0].toUpperCase()}</span>
      </div>
    )
  );

  const filteredConversations = conversations.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen pt-16 pb-0">
      <div className="container mx-auto max-w-5xl px-2 sm:px-4 pt-2 sm:pt-4">
        <div className="flex items-center justify-between mb-3">
          <motion.h1 className="font-heading text-2xl sm:text-3xl font-bold" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="text-gradient">Messages</span>
          </motion.h1>
          <CreateGroupDialog onGroupCreated={fetchConversations} />
        </div>

        <div className="bg-card rounded-2xl overflow-hidden grid md:grid-cols-[320px_1fr] h-[calc(100vh-130px)] min-h-0 shadow-soft border border-border/50">
          {/* Sidebar */}
          <div className={`border-r border-border/50 flex flex-col min-h-0 ${activeChat && !showSidebar ? "hidden md:flex" : ""}`}>
            <div className="p-3 border-b border-border/50 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search chats..."
                  className="pl-9 rounded-full text-sm h-9 bg-muted/50 border-0"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  {conversations.length === 0 ? "No conversations yet. Follow people from your Profile to start chatting!" : "No matching chats"}
                </div>
              ) : (
                filteredConversations.map((c) => (
                  <div key={c.userId} className="relative group/conv">
                    <button
                      className={`w-full p-3 text-left flex items-center gap-3 transition-colors ${
                        activeChat === c.userId ? "bg-primary/10" : "hover:bg-muted/50"
                      }`}
                      onClick={() => { setActiveChat(c.userId); setShowSidebar(false); }}
                    >
                      <div className="relative">
                        {c.isGroup ? (
                          <div className="h-12 w-12 rounded-full bg-gradient-primary flex items-center justify-center shrink-0"><Users className="h-5 w-5 text-white" /></div>
                        ) : (
                          <AvatarEl url={c.avatarUrl} name={c.name} size="h-12 w-12" />
                        )}
                        {!c.isGroup && <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-card" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm truncate">{c.name}{c.isGroup ? " 👥" : ""}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0">{c.lastTime}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{c.lastMessage}</p>
                      </div>
                      {c.unread > 0 && <span className="h-5 min-w-[20px] px-1 rounded-full bg-primary text-white text-[10px] flex items-center justify-center shrink-0 font-bold">{c.unread}</span>}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat area */}
          <div className={`flex min-h-0 flex-col bg-[hsl(var(--wa-bg))] ${!activeChat || showSidebar ? "hidden md:flex" : ""}`}>
            {activeChat ? (
              <>
                {/* Header with three-dot menu */}
                <div className="px-3 sm:px-4 py-3 border-b border-border/50 flex items-center gap-3 bg-card">
                  <button className="md:hidden text-muted-foreground" onClick={() => setShowSidebar(true)}><ChevronLeft className="h-5 w-5" /></button>
                  <div className="relative">
                    {isGroupChat ? (
                      <div className="h-9 w-9 rounded-full bg-gradient-primary flex items-center justify-center"><Users className="h-4 w-4 text-white" /></div>
                    ) : activeAvatar ? (
                      <img src={activeAvatar} alt="" className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-gradient-primary flex items-center justify-center"><User className="h-4 w-4 text-white" /></div>
                    )}
                    {!isGroupChat && <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-card" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{activeName}{isGroupChat ? " 👥" : ""}</p>
                    {otherTyping ? (
                      <p className="text-xs text-primary animate-pulse">typing...</p>
                    ) : isGroupChat ? (
                      <p className="text-xs text-muted-foreground">{groupMembersInfo.length} members</p>
                    ) : (
                      <p className="text-xs text-green-500">online</p>
                    )}
                  </div>

                  {/* Three-dot menu (WhatsApp style) */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {isGroupChat ? (
                        <>
                          <DropdownMenuItem onClick={() => setGroupInfoOpen(true)}>
                            <Users className="h-4 w-4 mr-2" /> Group Info
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={leaveGroup}>
                            <LeaveIcon className="h-4 w-4 mr-2" /> Leave Group
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <>
                          <DropdownMenuItem onClick={toggleFollow}>
                            {isFollowing ? (
                              <><UserX className="h-4 w-4 mr-2" /> Unfollow</>
                            ) : (
                              <><UserCheck className="h-4 w-4 mr-2" /> Follow</>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(activeChat)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete Chat
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Messages with date separators */}
                <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 sm:px-4 py-4">
                  <div className="flex min-h-full flex-col justify-end">
                    <div className="space-y-2">
                      {chatMode === "dm"
                        ? renderMessagesWithDates(messages, false)
                        : renderMessagesWithDates(groupMessages, true)
                      }
                      {otherTyping && (
                        <div className="flex justify-start">
                          <div className="bg-white rounded-2xl px-4 py-2 text-sm text-muted-foreground border border-border/30 shadow-sm">
                            <span className="flex gap-1">
                              <span className="animate-bounce inline-block" style={{ animationDelay: "0ms" }}>•</span>
                              <span className="animate-bounce inline-block" style={{ animationDelay: "150ms" }}>•</span>
                              <span className="animate-bounce inline-block" style={{ animationDelay: "300ms" }}>•</span>
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Reply preview */}
                {replyingTo && (
                  <div className="px-4 py-2 border-t border-border/30 bg-card flex items-center gap-2">
                    <Reply className="h-4 w-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-primary">{replyingTo.senderName}</p>
                      <p className="text-xs text-muted-foreground truncate">{replyingTo.content}</p>
                    </div>
                    <button onClick={() => setReplyingTo(null)} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
                  </div>
                )}

                {/* Input bar */}
                <div className="border-t border-border/50 bg-card">
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
                  <div className="p-2 sm:p-3 flex gap-2 items-center">
                    <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e, "image")} />
                    <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.xlsx,.xls,.zip,.rar" className="hidden" onChange={(e) => handleFileSelect(e, "file")} />
                    <button onClick={() => imageInputRef.current?.click()} className="text-muted-foreground hover:text-primary transition-colors p-1.5 rounded-full hover:bg-muted"><ImageIcon className="h-5 w-5" /></button>
                    <button onClick={() => fileInputRef.current?.click()} className="text-muted-foreground hover:text-primary transition-colors p-1.5 rounded-full hover:bg-muted"><Paperclip className="h-5 w-5" /></button>
                    <Input
                      placeholder="Type a message..."
                      value={newMsg}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      className="min-w-0 flex-1 rounded-full bg-muted/50"
                    />
                    <Button
                      onClick={handleSend}
                      className={`rounded-full transition-colors ${newMsg.trim() || attachmentPreview ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}
                      disabled={uploading || (!newMsg.trim() && !attachmentPreview)}
                      size="icon"
                    >
                      {uploading ? <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm flex-col gap-2 bg-card">
                <MessageSquare className="h-10 w-10 opacity-30" />
                <p>Select a conversation to start chatting</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Chat Confirm Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Chat?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently delete all messages in this conversation for both users.</p>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" className="flex-1" onClick={() => deleteTarget && deleteChat(deleteTarget)}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Group Info Dialog with Add Members */}
      <Dialog open={groupInfoOpen} onOpenChange={setGroupInfoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Group Info
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {isCurrentUserAdmin() && activeChat && (
              <AddGroupMembersDialog
                groupId={activeChat.replace("group:", "")}
                existingMemberIds={groupMembersInfo.map(m => m.user_id)}
                onMembersAdded={() => {
                  fetchGroupMembersInfo(activeChat!.replace("group:", ""));
                  fetchConversations();
                }}
              />
            )}
            <div>
              <h4 className="font-medium text-sm mb-2">Members ({groupMembersInfo.length})</h4>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {groupMembersInfo.map((m) => {
                  const isCreator = m.user_id === currentGroupCreator;
                  const isAdmin = m.role === "admin" || isCreator;
                  const canManage = isCurrentUserAdmin() && m.user_id !== user?.id;
                  return (
                    <div key={m.user_id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50">
                      <AvatarEl url={m.profile.avatar_url} name={m.profile.full_name} size="h-8 w-8" />
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
