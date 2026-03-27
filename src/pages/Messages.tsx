import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Send, User, Circle, Paperclip, Image as ImageIcon, FileText, X, Download, Check, CheckCheck, Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import CreateGroupDialog from "@/components/CreateGroupDialog";
import { Link } from "react-router-dom";

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

const Messages = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null); // DM userId or group:<groupId>
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [typing, setTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachmentPreview, setAttachmentPreview] = useState<{ file: File; previewUrl?: string; type: string } | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [groupMessages, setGroupMessages] = useState<any[]>([]);
  const [chatMode, setChatMode] = useState<"dm" | "group">("dm");
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeChatRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, []);

  useEffect(() => {
    // Small delay to ensure DOM is updated
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages, scrollToBottom]);

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
                // Mark as read if we're the receiver
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
          if (status === "SUBSCRIBED") {
            await presenceChannel.track({ online: true });
          }
        });

      // Group messages realtime
      const groupChannel = supabase
        .channel("group-messages-realtime")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_messages" }, (payload) => {
          const msg = payload.new as any;
          const currentActive = activeChatRef.current;
          if (currentActive && currentActive === `group:${msg.group_id}`) {
            setGroupMessages((prev) => [...prev, msg]);
          }
          fetchConversations();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
        supabase.removeChannel(presenceChannel);
        supabase.removeChannel(groupChannel);
      };
    }
  }, [user]);

  useEffect(() => {
    if (activeChat) {
      if (activeChat.startsWith("group:")) {
        setChatMode("group");
        fetchGroupMessages(activeChat.replace("group:", ""));
      } else {
        setChatMode("dm");
        fetchMessages(activeChat);
      }
    }
  }, [activeChat]);

  const fetchConversations = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

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

      convs.push({
        userId,
        name: profile?.full_name || "Anonymous",
        avatarUrl: profile?.avatar_url || null,
        lastMessage: lastText,
        lastTime: new Date(lastMsg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        unread,
      });
    }
    setConversations(convs);

    // Fetch group conversations
    const { data: memberData } = await supabase.from("group_members").select("group_id").eq("user_id", user.id);
    if (memberData) {
      for (const gm of memberData) {
        const { data: group } = await supabase.from("group_chats").select("*").eq("id", gm.group_id).single();
        if (!group) continue;
        const { data: lastGMsg } = await supabase.from("group_messages").select("*").eq("group_id", gm.group_id).order("created_at", { ascending: false }).limit(1);
        const lastMsg = lastGMsg?.[0];
        convs.push({
          userId: `group:${group.id}`,
          groupId: group.id,
          name: group.name,
          avatarUrl: group.avatar_url || null,
          lastMessage: lastMsg?.content || "No messages yet",
          lastTime: lastMsg ? new Date(lastMsg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
          unread: 0,
          isGroup: true,
        });
      }
    }

    setConversations(convs);
    if (convs.length > 0 && !activeChatRef.current) setActiveChat(convs[0].userId);
  };

  const fetchGroupMessages = async (groupId: string) => {
    const { data } = await supabase
      .from("group_messages")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true });
    if (data) setGroupMessages(data);
  };

  const fetchMessages = async (otherUserId: string) => {
    if (!user) return;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as Message[]);

    await supabase.from("messages").update({ read: true }).eq("receiver_id", user.id).eq("sender_id", otherUserId).eq("read", false);
  };

  const handleTyping = useCallback(() => {
    if (!user || !activeChat) return;
    supabase.channel("presence-chat").send({
      type: "broadcast",
      event: "typing",
      payload: { userId: user.id, to: activeChat },
    });
  }, [user, activeChat]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMsg(e.target.value);
    if (!typing) {
      setTyping(true);
      handleTyping();
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setTyping(false), 1500);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "file") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview: { file: File; previewUrl?: string; type: string } = { file, type };
    if (type === "image") {
      const reader = new FileReader();
      reader.onload = () => {
        preview.previewUrl = reader.result as string;
        setAttachmentPreview(preview);
      };
      reader.readAsDataURL(file);
    } else {
      setAttachmentPreview(preview);
    }
    e.target.value = "";
  };

  const clearAttachment = () => setAttachmentPreview(null);

  const handleSend = async () => {
    if ((!newMsg.trim() && !attachmentPreview) || !user || !activeChat) return;

    // Group message
    if (activeChat.startsWith("group:")) {
      const groupId = activeChat.replace("group:", "");
      let attachmentUrl: string | null = null;
      let attachmentType: string | null = null;
      let attachmentName: string | null = null;

      if (attachmentPreview) {
        setUploading(true);
        const file = attachmentPreview.file;
        const ext = file.name.split(".").pop();
        const bucket = attachmentPreview.type === "image" ? "resource-images" : "resource-files";
        const filePath = `group/${groupId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file);
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
          attachmentUrl = urlData.publicUrl;
          attachmentType = attachmentPreview.type;
          attachmentName = file.name;
        }
        setUploading(false);
      }

      await supabase.from("group_messages").insert({
        group_id: groupId,
        sender_id: user.id,
        content: newMsg.trim() || (attachmentType === "image" ? "📷 Photo" : `📎 ${attachmentName}`),
        attachment_url: attachmentUrl,
        attachment_type: attachmentType,
        attachment_name: attachmentName,
      });
      setNewMsg("");
      setAttachmentPreview(null);
      return;
    }

    let attachmentUrl: string | null = null;
    let attachmentType: string | null = null;
    let attachmentName: string | null = null;

    if (attachmentPreview) {
      setUploading(true);
      const file = attachmentPreview.file;
      const ext = file.name.split(".").pop();
      const bucket = attachmentPreview.type === "image" ? "resource-images" : "resource-files";
      const filePath = `chat/${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      
      const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file);
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
        attachmentUrl = urlData.publicUrl;
        attachmentType = attachmentPreview.type;
        attachmentName = file.name;
      }
      setUploading(false);
    }

    await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: activeChat,
      content: newMsg.trim() || (attachmentType === "image" ? "📷 Photo" : `📎 ${attachmentName}`),
      attachment_url: attachmentUrl,
      attachment_type: attachmentType,
      attachment_name: attachmentName,
    });
    setNewMsg("");
    setAttachmentPreview(null);
  };

  const activeConv = conversations.find((c) => c.userId === activeChat);
  const activeName = activeConv?.name || "";
  const activeAvatar = activeConv?.avatarUrl;
  const isGroupChat = activeConv?.isGroup;

  const renderTicks = (m: Message) => {
    if (m.sender_id !== user?.id) return null;
    if (m.read) {
      return <CheckCheck className="h-3.5 w-3.5 text-blue-400 inline-block ml-1" />;
    }
    return <Check className="h-3.5 w-3.5 text-white/60 inline-block ml-1" />;
  };

  const renderMessageContent = (m: Message) => {
    const isMine = m.sender_id === user?.id;
    return (
      <>
        {m.attachment_type === "image" && m.attachment_url && (
          <a href={m.attachment_url} target="_blank" rel="noopener noreferrer">
            <img src={m.attachment_url} alt="Shared" className="rounded-xl max-w-[240px] max-h-[200px] object-cover mb-1" />
          </a>
        )}
        {m.attachment_type === "file" && m.attachment_url && (
          <a href={m.attachment_url} target="_blank" rel="noopener noreferrer"
            className={`flex items-center gap-2 rounded-xl px-3 py-2 mb-1 ${isMine ? "bg-white/20" : "bg-muted"}`}>
            <FileText className="h-4 w-4 shrink-0" />
            <span className="text-xs truncate max-w-[150px]">{m.attachment_name || "File"}</span>
            <Download className="h-3 w-3 shrink-0" />
          </a>
        )}
        {m.content && !(m.attachment_type && (m.content === "📷 Photo" || m.content.startsWith("📎"))) && (
          <p className="break-words whitespace-pre-wrap leading-relaxed">{m.content}</p>
        )}
        <div className={`flex items-center justify-end gap-0.5 mt-1 ${isMine ? "text-white/60" : "text-muted-foreground"}`}>
          <span className="text-xs">
            {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          {renderTicks(m)}
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen pt-16 px-4 pb-8">
      <div className="container mx-auto max-w-5xl pt-4">
        <motion.h1
          className="font-heading text-3xl font-bold mb-6"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        >
          <span className="text-gradient">Messages</span>
        </motion.h1>
        <div className="flex items-center gap-2 mb-4">
          <CreateGroupDialog onGroupCreated={fetchConversations} />
          <Link to="/friends">
            <Button size="sm" variant="outline" className="gap-1.5 rounded-full">
              <Users className="h-4 w-4" /> Friends
            </Button>
          </Link>
        </div>

        <div className="bg-card rounded-2xl overflow-hidden grid md:grid-cols-[280px_1fr] h-[70vh] min-h-0 shadow-soft border border-border/50">
          {/* Sidebar */}
          <div className={`border-r border-border/50 min-h-0 overflow-y-auto overflow-x-hidden ${activeChat && !showSidebar ? "hidden md:block" : ""}`}>
            {conversations.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                No conversations yet. Start chatting from a resource page!
              </div>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.userId}
                  className={`w-full p-4 text-left flex items-center gap-3 hover:bg-muted/50 transition-colors ${activeChat === c.userId ? "bg-muted/50" : ""}`}
                  onClick={() => { setActiveChat(c.userId); setShowSidebar(false); }}
                >
                  <div className="relative">
                    {c.isGroup ? (
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                        <Users className="h-5 w-5 text-white" />
                      </div>
                    ) : c.avatarUrl ? (
                      <img src={c.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center shrink-0">
                        <User className="h-5 w-5 text-white" />
                      </div>
                    )}
                    {!c.isGroup && <Circle className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 text-primary fill-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{c.name}{c.isGroup && " 👥"}</span>
                      <span className="text-xs text-muted-foreground">{c.lastTime}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{c.lastMessage}</p>
                  </div>
                  {c.unread > 0 && (
                    <span className="h-5 w-5 rounded-full bg-gradient-primary text-white text-xs flex items-center justify-center">
                      {c.unread}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Chat area */}
            <div className="flex min-h-0 flex-col">
            {activeChat && (
              <div className="px-4 py-3 border-b border-border/50 flex items-center gap-3">
                <button className="md:hidden text-muted-foreground mr-1" onClick={() => setShowSidebar(true)}>
                  ←
                </button>
                <div className="relative">
                  {isGroupChat ? (
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <Users className="h-4 w-4 text-white" />
                    </div>
                  ) : activeAvatar ? (
                    <img src={activeAvatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  )}
                  {!isGroupChat && <Circle className="absolute -bottom-0.5 -right-0.5 h-3 w-3 text-primary fill-primary" />}
                </div>
                <div>
                  <p className="font-semibold text-sm">{activeName}{isGroupChat ? " 👥" : ""}</p>
                  {otherTyping ? (
                    <p className="text-xs text-primary animate-pulse">typing...</p>
                  ) : isGroupChat ? (
                    <p className="text-xs text-muted-foreground">Group chat</p>
                  ) : (
                    <p className="text-xs text-primary">online</p>
                  )}
                </div>
              </div>
            )}

            {/* Messages - flex-col-reverse ensures scroll starts at bottom */}
              <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-4">
                <div className="flex min-h-full flex-col justify-end">
                  <div className="space-y-3">
                {chatMode === "dm" ? (
                  messages.map((m) => (
                    <div key={m.id} className={`flex ${m.sender_id === user?.id ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[78%] overflow-hidden rounded-2xl px-4 py-2 text-sm shadow-sm ${
                        m.sender_id === user?.id
                          ? "bg-gradient-primary text-white"
                          : "bg-muted text-foreground"
                      }`}>
                        {renderMessageContent(m)}
                      </div>
                    </div>
                  ))
                ) : (
                  groupMessages.map((m) => (
                    <div key={m.id} className={`flex ${m.sender_id === user?.id ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[78%] overflow-hidden rounded-2xl px-4 py-2 text-sm shadow-sm ${
                        m.sender_id === user?.id
                          ? "bg-gradient-primary text-white"
                          : "bg-muted text-foreground"
                      }`}>
                        {m.sender_id !== user?.id && (
                          <p className="text-xs font-semibold mb-1 opacity-70">Member</p>
                        )}
                        {m.attachment_type === "image" && m.attachment_url && (
                          <a href={m.attachment_url} target="_blank" rel="noopener noreferrer">
                            <img src={m.attachment_url} alt="Shared" className="rounded-xl max-w-[240px] max-h-[200px] object-cover mb-1" />
                          </a>
                        )}
                        {m.attachment_type === "file" && m.attachment_url && (
                          <a href={m.attachment_url} target="_blank" rel="noopener noreferrer"
                            className={`flex items-center gap-2 rounded-xl px-3 py-2 mb-1 ${m.sender_id === user?.id ? "bg-white/20" : "bg-muted"}`}>
                            <FileText className="h-4 w-4 shrink-0" />
                            <span className="text-xs truncate max-w-[150px]">{m.attachment_name || "File"}</span>
                            <Download className="h-4 w-4 shrink-0" />
                          </a>
                        )}
                        {m.content && !(m.attachment_type && (m.content === "📷 Photo" || m.content.startsWith("📎"))) && (
                          <p className="break-words whitespace-pre-wrap leading-relaxed">{m.content}</p>
                        )}
                        <div className="flex items-center justify-end mt-1">
                          <span className="text-xs opacity-60">
                            {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
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

            {activeChat && (
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
                    <button onClick={clearAttachment} className="text-muted-foreground hover:text-destructive">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                <div className="p-4 flex gap-2 items-center">
                  <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e, "image")} />
                  <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.xlsx,.xls,.zip,.rar" className="hidden" onChange={(e) => handleFileSelect(e, "file")} />

                  <button onClick={() => imageInputRef.current?.click()} className="text-muted-foreground hover:text-primary transition-colors p-1.5 rounded-full hover:bg-muted">
                    <ImageIcon className="h-5 w-5" />
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} className="text-muted-foreground hover:text-primary transition-colors p-1.5 rounded-full hover:bg-muted">
                    <Paperclip className="h-5 w-5" />
                  </button>

                  <Input
                    placeholder="Type a message..."
                    value={newMsg}
                    onChange={handleInputChange}
                    onKeyDown={(e) => e.key === "Enter" && !uploading && handleSend()}
                    className="min-w-0 flex-1 rounded-full"
                  />
                  <Button onClick={handleSend} className="bg-gradient-primary rounded-full text-white" disabled={uploading}>
                    {uploading ? (
                      <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;
