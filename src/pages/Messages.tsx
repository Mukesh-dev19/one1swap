import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Send, User } from "lucide-react";
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchConversations();
      subscribeToMessages();
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
    data.forEach((msg: Message) => {
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
    if (convs.length > 0 && !activeChat) setActiveChat(convs[0].userId);
  };

  const fetchMessages = async (otherUserId: string) => {
    if (!user) return;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as Message[]);
  };

  const subscribeToMessages = () => {
    if (!user) return;
    supabase
      .channel("messages-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const newMsg = payload.new as Message;
        if (newMsg.sender_id === user.id || newMsg.receiver_id === user.id) {
          if (activeChat && (newMsg.sender_id === activeChat || newMsg.receiver_id === activeChat)) {
            setMessages((prev) => [...prev, newMsg]);
          }
          fetchConversations();
        }
      })
      .subscribe();
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
                  <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-white" />
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
              <div ref={messagesEndRef} />
            </div>
            {activeChat && (
              <div className="p-4 border-t border-border/50 flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
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
