import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { UserPlus, UserCheck, UserX, Users, Search, X, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

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

const Friends = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"friends" | "requests" | "find">("friends");
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (user) {
      fetchFriends();
      fetchRequests();

      const channel = supabase
        .channel("friend-requests-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "friend_requests" }, () => {
          fetchRequests();
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [user]);

  const fetchFriends = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("friendships")
      .select("*")
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
    if (!data) return;

    const enriched = await Promise.all(
      data.map(async (f: any) => {
        const friendUserId = f.user_id === user.id ? f.friend_id : f.user_id;
        const { data: profile } = await supabase.from("profiles").select("user_id, full_name, avatar_url, college").eq("user_id", friendUserId).single();
        return { ...f, profile: profile || undefined } as Friendship;
      })
    );
    setFriends(enriched);
  };

  const fetchRequests = async () => {
    if (!user) return;
    const { data: incoming } = await supabase
      .from("friend_requests")
      .select("*")
      .eq("receiver_id", user.id)
      .eq("status", "pending");

    if (incoming) {
      const enriched = await Promise.all(
        incoming.map(async (r: any) => {
          const { data: profile } = await supabase.from("profiles").select("user_id, full_name, avatar_url, college").eq("user_id", r.sender_id).single();
          return { ...r, profile: profile || undefined } as FriendRequest;
        })
      );
      setIncomingRequests(enriched);
    }

    const { data: sent } = await supabase
      .from("friend_requests")
      .select("*")
      .eq("sender_id", user.id)
      .eq("status", "pending");
    if (sent) setSentRequests(sent as FriendRequest[]);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !user) return;
    setSearching(true);
    const { data } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url, college")
      .neq("user_id", user.id)
      .ilike("full_name", `%${searchQuery}%`)
      .limit(20);
    setSearchResults((data as Profile[]) || []);
    setSearching(false);
  };

  const sendFriendRequest = async (receiverId: string) => {
    if (!user) return;
    const { error } = await supabase.from("friend_requests").insert({
      sender_id: user.id,
      receiver_id: receiverId,
    });
    if (error) {
      if (error.code === "23505") {
        toast({ title: "Already sent", description: "Friend request already exists." });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    } else {
      toast({ title: "Request sent! 🎉" });
      fetchRequests();
    }
  };

  const acceptRequest = async (requestId: string, senderId: string) => {
    if (!user) return;
    const { error: updateError } = await supabase.from("friend_requests").update({ status: "accepted" }).eq("id", requestId);
    if (updateError) { toast({ title: "Error", description: updateError.message, variant: "destructive" }); return; }

    // Create bidirectional friendship
    await supabase.from("friendships").insert({ user_id: user.id, friend_id: senderId });
    await supabase.from("friendships").insert({ user_id: senderId, friend_id: user.id });

    toast({ title: "Friend added! 🤝" });
    fetchFriends();
    fetchRequests();
  };

  const rejectRequest = async (requestId: string) => {
    await supabase.from("friend_requests").update({ status: "rejected" }).eq("id", requestId);
    toast({ title: "Request declined" });
    fetchRequests();
  };

  const removeFriend = async (friendshipId: string, friendUserId: string) => {
    if (!user) return;
    await supabase.from("friendships").delete().or(`and(user_id.eq.${user.id},friend_id.eq.${friendUserId}),and(user_id.eq.${friendUserId},friend_id.eq.${user.id})`);
    toast({ title: "Friend removed" });
    fetchFriends();
  };

  const messageFriend = async (friendUserId: string) => {
    if (!user) return;
    // Check if conversation already exists
    const { data: existing } = await supabase.from("messages")
      .select("id")
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friendUserId}),and(sender_id.eq.${friendUserId},receiver_id.eq.${user.id})`)
      .limit(1);

    if (!existing || existing.length === 0) {
      await supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: friendUserId,
        content: "👋 Hey!",
      });
    }
    navigate("/messages");
  };

  const isFriend = (userId: string) => friends.some(f => f.profile?.user_id === userId);
  const hasSentRequest = (userId: string) => sentRequests.some(r => r.receiver_id === userId);

  const Avatar = ({ url, name }: { url: string | null; name: string | null }) => (
    url ? (
      <img src={url} alt="" className="h-10 w-10 rounded-full object-cover" />
    ) : (
      <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center shrink-0">
        <span className="text-white font-bold text-sm">{(name || "?")[0].toUpperCase()}</span>
      </div>
    )
  );

  return (
    <div className="min-h-screen pt-16 px-4 pb-8">
      <div className="container mx-auto max-w-3xl pt-4">
        <motion.h1 className="font-heading text-3xl font-bold mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <span className="text-gradient">Friends</span>
        </motion.h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { key: "friends" as const, label: "My Friends", icon: Users, count: friends.length },
            { key: "requests" as const, label: "Requests", icon: UserCheck, count: incomingRequests.length },
            { key: "find" as const, label: "Find People", icon: Search },
          ].map((t) => (
            <Button
              key={t.key}
              variant={tab === t.key ? "default" : "outline"}
              size="sm"
              className={`gap-1.5 rounded-full ${tab === t.key ? "bg-gradient-primary text-white" : ""}`}
              onClick={() => setTab(t.key)}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center rounded-full bg-white/20 text-xs">
                  {t.count}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {/* Friends List */}
        {tab === "friends" && (
          <div className="space-y-3">
            {friends.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p>No friends yet. Find people and send them a request!</p>
              </div>
            ) : (
              friends.map((f) => (
                <motion.div key={f.id} className="bg-card rounded-2xl p-4 flex items-center gap-3 shadow-soft border border-border/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Avatar url={f.profile?.avatar_url || null} name={f.profile?.full_name || null} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{f.profile?.full_name || "Anonymous"}</p>
                    {f.profile?.college && <p className="text-xs text-muted-foreground">{f.profile.college}</p>}
                  </div>
                  <Button size="sm" variant="outline" className="gap-1 rounded-full" onClick={() => messageFriend(f.profile?.user_id || "")}>
                    <MessageSquare className="h-3 w-3" /> Chat
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive rounded-full" onClick={() => removeFriend(f.id, f.profile?.user_id || "")}>
                    <X className="h-4 w-4" />
                  </Button>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Requests */}
        {tab === "requests" && (
          <div className="space-y-4">
            <h3 className="font-heading font-semibold text-lg">Incoming Requests</h3>
            {incomingRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No pending requests.</p>
            ) : (
              incomingRequests.map((r) => (
                <motion.div key={r.id} className="bg-card rounded-2xl p-4 flex items-center gap-3 shadow-soft border border-border/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Avatar url={r.profile?.avatar_url || null} name={r.profile?.full_name || null} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{r.profile?.full_name || "Anonymous"}</p>
                    <p className="text-xs text-muted-foreground">Wants to be your friend</p>
                  </div>
                  <Button size="sm" className="gap-1 rounded-full bg-gradient-primary text-white" onClick={() => acceptRequest(r.id, r.sender_id)}>
                    <UserCheck className="h-3 w-3" /> Accept
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-full" onClick={() => rejectRequest(r.id)}>
                    <UserX className="h-3 w-3" />
                  </Button>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Find People */}
        {tab === "find" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="rounded-full"
              />
              <Button onClick={handleSearch} className="bg-gradient-primary text-white rounded-full" disabled={searching}>
                <Search className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              {searchResults.map((p) => (
                <motion.div key={p.user_id} className="bg-card rounded-2xl p-4 flex items-center gap-3 shadow-soft border border-border/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Avatar url={p.avatar_url} name={p.full_name} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{p.full_name || "Anonymous"}</p>
                    {p.college && <p className="text-xs text-muted-foreground">{p.college}</p>}
                  </div>
                  {isFriend(p.user_id) ? (
                    <Badge variant="outline" className="text-primary">Friends ✓</Badge>
                  ) : hasSentRequest(p.user_id) ? (
                    <Badge variant="outline">Pending</Badge>
                  ) : (
                    <Button size="sm" className="gap-1 rounded-full bg-gradient-primary text-white" onClick={() => sendFriendRequest(p.user_id)}>
                      <UserPlus className="h-3 w-3" /> Add
                    </Button>
                  )}
                </motion.div>
              ))}
              {searchResults.length === 0 && searchQuery && !searching && (
                <p className="text-center text-sm text-muted-foreground py-8">No users found. Try a different name.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Friends;