import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Plus, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface UserProfile {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface CreateGroupDialogProps {
  onGroupCreated?: () => void;
}

const CreateGroupDialog = ({ onGroupCreated }: CreateGroupDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (open && user) {
      fetchFriends();
      fetchAllUsers();
    }
  }, [open, user]);

  const fetchFriends = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("friendships")
      .select("*")
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
    if (!data) return;
    const friendIds = [...new Set(data.map((f: any) => f.user_id === user.id ? f.friend_id : f.user_id))];
    if (friendIds.length === 0) { setFriends([]); return; }
    const profiles: UserProfile[] = [];
    for (const fid of friendIds) {
      const { data: p } = await supabase.from("profiles").select("user_id, full_name, avatar_url").eq("user_id", fid).single();
      if (p) profiles.push(p as UserProfile);
    }
    setFriends(profiles);
  };

  const fetchAllUsers = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("user_id, full_name, avatar_url").neq("user_id", user.id).limit(100);
    if (data) setAllUsers(data as UserProfile[]);
  };

  const toggleFriend = (userId: string) => {
    setSelected((prev) => prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]);
  };

  const handleCreate = async () => {
    if (!name.trim() || !user) return;
    if (selected.length === 0) {
      toast({ title: "Select at least one member", variant: "destructive" });
      return;
    }
    setCreating(true);
    const { data: group, error } = await supabase.from("group_chats").insert({
      name: name.trim(),
      description: description.trim() || null,
      created_by: user.id,
    }).select().single();

    if (error || !group) {
      toast({ title: "Error creating group", description: error?.message, variant: "destructive" });
      setCreating(false);
      return;
    }

    await supabase.from("group_members").insert({ group_id: group.id, user_id: user.id, role: "admin" });
    for (const memberId of selected) {
      await supabase.from("group_members").insert({ group_id: group.id, user_id: memberId, role: "member" });
    }

    toast({ title: "Group created! 🎉", description: `${name} with ${selected.length + 1} members` });
    setCreating(false);
    setOpen(false);
    setName("");
    setDescription("");
    setSelected([]);
    setSearchQuery("");
    onGroupCreated?.();
  };

  const friendIds = new Set(friends.map(f => f.user_id));
  const otherUsers = allUsers.filter(u => !friendIds.has(u.user_id));

  const filterUsers = (users: UserProfile[]) =>
    searchQuery ? users.filter(u => (u.full_name || "").toLowerCase().includes(searchQuery.toLowerCase())) : users;

  const filteredFriends = filterUsers(friends);
  const filteredOthers = filterUsers(otherUsers);

  const UserRow = ({ u }: { u: UserProfile }) => (
    <label key={u.user_id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 cursor-pointer transition-colors">
      <Checkbox checked={selected.includes(u.user_id)} onCheckedChange={() => toggleFriend(u.user_id)} />
      {u.avatar_url ? (
        <img src={u.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
      ) : (
        <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center">
          <span className="text-white text-xs font-bold">{(u.full_name || "?")[0].toUpperCase()}</span>
        </div>
      )}
      <span className="text-sm font-medium">{u.full_name || "Anonymous"}</span>
    </label>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 rounded-full bg-gradient-primary text-white">
          <Plus className="h-4 w-4" /> New Group
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Create Group Chat
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>Group Name</Label>
            <Input placeholder="e.g. Study Buddies" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Input placeholder="What's this group about?" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Add Members</Label>
            <div className="relative mt-1 mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search users..." className="pl-9 text-sm h-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <div className="max-h-56 overflow-y-auto space-y-1">
              {filteredFriends.length > 0 && (
                <>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 pt-1">Friends</p>
                  {filteredFriends.map((f) => <UserRow key={f.user_id} u={f} />)}
                </>
              )}
              {filteredOthers.length > 0 && (
                <>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 pt-2">Other Users</p>
                  {filteredOthers.map((u) => <UserRow key={u.user_id} u={u} />)}
                </>
              )}
              {filteredFriends.length === 0 && filteredOthers.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">No users found.</p>
              )}
            </div>
          </div>
          <Button onClick={handleCreate} className="w-full bg-gradient-primary text-white font-semibold" disabled={creating || !name.trim()}>
            {creating ? "Creating..." : `Create Group (${selected.length + 1} members)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupDialog;
