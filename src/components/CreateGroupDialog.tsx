import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Friend {
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
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open && user) fetchFriends();
  }, [open, user]);

  const fetchFriends = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("friendships")
      .select("*")
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
    if (!data) return;

    const friendIds = data.map((f: any) => f.user_id === user.id ? f.friend_id : f.user_id);
    const uniqueIds = [...new Set(friendIds)];

    if (uniqueIds.length === 0) { setFriends([]); return; }

    const profiles: Friend[] = [];
    for (const fid of uniqueIds) {
      const { data: p } = await supabase.from("profiles").select("user_id, full_name, avatar_url").eq("user_id", fid).single();
      if (p) profiles.push(p as Friend);
    }
    setFriends(profiles);
  };

  const toggleFriend = (userId: string) => {
    setSelected((prev) => prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]);
  };

  const handleCreate = async () => {
    if (!name.trim() || !user) return;
    if (selected.length === 0) {
      toast({ title: "Select at least one friend", variant: "destructive" });
      return;
    }

    setCreating(true);

    // Create group
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

    // Add creator as admin
    await supabase.from("group_members").insert({
      group_id: group.id,
      user_id: user.id,
      role: "admin",
    });

    // Add selected friends
    for (const friendId of selected) {
      await supabase.from("group_members").insert({
        group_id: group.id,
        user_id: friendId,
        role: "member",
      });
    }

    toast({ title: "Group created! 🎉", description: `${name} with ${selected.length + 1} members` });
    setCreating(false);
    setOpen(false);
    setName("");
    setDescription("");
    setSelected([]);
    onGroupCreated?.();
  };

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
            <Label>Add Friends</Label>
            <div className="mt-2 max-h-48 overflow-y-auto space-y-2">
              {friends.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Add friends first to create a group.</p>
              ) : (
                friends.map((f) => (
                  <label key={f.user_id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 cursor-pointer transition-colors">
                    <Checkbox checked={selected.includes(f.user_id)} onCheckedChange={() => toggleFriend(f.user_id)} />
                    {f.avatar_url ? (
                      <img src={f.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center">
                        <span className="text-white text-xs font-bold">{(f.full_name || "?")[0].toUpperCase()}</span>
                      </div>
                    )}
                    <span className="text-sm font-medium">{f.full_name || "Anonymous"}</span>
                  </label>
                ))
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