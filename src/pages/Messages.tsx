import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Send, User, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean | null;
}

interface Conversation {
  userId: string;
  name: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
}

const Messages = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [typing, setTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeChatRef = useRef<string | null>(null);

  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);

  useEffect(() => {
    if (user) {
      fetchConversations();
      const channel = supabase
        .channel("messages-realtime")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
          const msg = payload.new as Message;
          if (msg.sender_id === user.id || msg.receiver_id === user.id) {
            const currentActive = activeChatRef.current;
            if (currentActive && (msg.sender_id === currentActive || msg.receiver_id === currentActive)) {
              setMessages((prev) => [...prev, msg]);
            }
            fetchConversations();
          }
        })
        .subscribe();

      // Presence channel for typing/online
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

      return () => {
        supabase.removeChannel(channel);
        supabase.removeChannel(presenceChannel);
      };
    }
  }, [user]);

  useEffect(() => {
    if (activeChat) fetchMessages(activeChat);
  }, [activeChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", userId).single();
      const unread = msgs.filter((m) => m.receiver_id === user.id && !m.read).length;
      convs.push({
        userId,
        name: profile?.full_name || "Anonymous",
        lastMessage: msgs[0].content,
        lastTime: new Date(msgs[0].created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        unread,
      });
    }
    setConversations(convs);
    if (convs.length > 0 && !activeChatRef.current) setActiveChat(convs[0].userId);
  };

  const fetchMessages = async (otherUserId: string) => {
    if (!user) return;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as Message[]);

    // Mark messages as read
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

  const handleSend = async () => {
    if (!newMsg.trim() || !user || !activeChat) return;
    await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: activeChat,
      content: newMsg,
    });
    setNewMsg("");
  };

  const activeName = conversations.find((c) => c.userId === activeChat)?.name || "";

  return (
    <div className="min-h-screen pt-16 px-4 pb-8">
      <div className="container mx-auto max-w-5xl pt-4">
        <motion.h1
          className="font-heading text-3xl font-bold mb-6"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        >
          <span className="text-gradient">Messages</span>
        </motion.h1>

        <div className="bg-card rounded-2xl overflow-hidden grid md:grid-cols-[280px_1fr] h-[70vh] shadow-soft border border-border/50">
          {/* Sidebar */}
          <div className="border-r border-border/50 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                No conversations yet. Start chatting from a resource page!
              </div>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.userId}
                  className={`w-full p-4 text-left flex items-center gap-3 hover:bg-muted/50 transition-colors ${activeChat === c.userId ? "bg-muted/50" : ""}`}
                  onClick={() => setActiveChat(c.userId)}
                >
                  <div className="relative">
                    <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <Circle className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 text-primary fill-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{c.name}</span>
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

          {/* Chat */}
          <div className="flex flex-col">
            {activeChat && (
              <div className="px-4 py-3 border-b border-border/50 flex items-center gap-3">
                <div className="relative">
                  <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <Circle className="absolute -bottom-0.5 -right-0.5 h-3 w-3 text-primary fill-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{activeName}</p>
                  {otherTyping ? (
                    <p className="text-xs text-primary animate-pulse">typing...</p>
                  ) : (
                    <p className="text-xs text-primary">online</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender_id === user?.id ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                    m.sender_id === user?.id
                      ? "bg-gradient-primary text-white"
                      : "bg-muted text-foreground"
                  }`}>
                    <p>{m.content}</p>
                    <p className={`text-xs mt-1 ${m.sender_id === user?.id ? "text-white/60" : "text-muted-foreground"}`}>
                      {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
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
              <div ref={messagesEndRef} />
            </div>
            {activeChat && (
              <div className="p-4 border-t border-border/50 flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMsg}
                  onChange={handleInputChange}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  className="rounded-full"
                />
                <Button onClick={handleSend} className="bg-gradient-primary rounded-full text-white">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;
