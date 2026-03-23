import { useState } from "react";
import { motion } from "framer-motion";
import { Send, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MOCK_CONVERSATIONS = [
  { id: 1, name: "Alex M.", lastMsg: "Sure, let's meet at the library!", time: "5m", unread: 2 },
  { id: 2, name: "Sarah K.", lastMsg: "Is the textbook still available?", time: "1h", unread: 0 },
  { id: 3, name: "James L.", lastMsg: "Thanks for the trade!", time: "2d", unread: 0 },
];

const MOCK_MESSAGES = [
  { id: 1, from: "them", text: "Hey! I saw your calculus textbook listing.", time: "2:30 PM" },
  { id: 2, from: "me", text: "Hi! Yes it's still available.", time: "2:32 PM" },
  { id: 3, from: "them", text: "Great! Can we meet at the library tomorrow?", time: "2:33 PM" },
  { id: 4, from: "me", text: "Sure, let's meet at the library!", time: "2:35 PM" },
];

const Messages = () => {
  const [activeChat, setActiveChat] = useState(1);
  const [newMsg, setNewMsg] = useState("");
  const [messages, setMessages] = useState(MOCK_MESSAGES);

  const handleSend = () => {
    if (!newMsg.trim()) return;
    setMessages([...messages, { id: Date.now(), from: "me", text: newMsg, time: "Now" }]);
    setNewMsg("");
  };

  return (
    <div className="min-h-screen pt-20 px-4">
      <div className="container mx-auto max-w-5xl">
        <motion.h1
          className="font-heading text-3xl font-bold mb-6"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        >
          <span className="text-gradient">Messages</span>
        </motion.h1>

        <div className="glass rounded-2xl overflow-hidden grid md:grid-cols-[280px_1fr] h-[70vh]">
          {/* Sidebar */}
          <div className="border-r border-border/50 overflow-y-auto">
            {MOCK_CONVERSATIONS.map((c) => (
              <button
                key={c.id}
                className={`w-full p-4 text-left flex items-center gap-3 hover:bg-secondary/50 transition-colors ${activeChat === c.id ? "bg-secondary/50" : ""}`}
                onClick={() => setActiveChat(c.id)}
              >
                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{c.name}</span>
                    <span className="text-xs text-muted-foreground">{c.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{c.lastMsg}</p>
                </div>
                {c.unread > 0 && (
                  <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                    {c.unread}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Chat */}
          <div className="flex flex-col">
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                    m.from === "me" ? "bg-gradient-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                  }`}>
                    <p>{m.text}</p>
                    <p className={`text-xs mt-1 ${m.from === "me" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{m.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-border/50 flex gap-2">
              <Input
                placeholder="Type a message..."
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                className="bg-card"
              />
              <Button onClick={handleSend} className="bg-gradient-primary">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;
