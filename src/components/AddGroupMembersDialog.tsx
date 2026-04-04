import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { UserPlus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface AddGroupMembersDialogProps {
  groupId: string;
  existingMemberIds: string[];
  onMembersAdded?: () => void;
}

interface Friend {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

const AddGroupMembersDialog = ({ groupId, existingMemberIds, onMembersAdded }: AddGroupMembersDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (open && user) fetchAvailableFriends();
  }, [open, user]);

  const fetchAvailableFriends = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("friendships")
      .select("*")
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
    if (!data) return;

    const friendIds = data.map((f: any) => f.user_id === user.id ? f.friend_id : f.user_id);
    const uniqueIds = [...new Set(friendIds)].filter(id => !existingMemberIds.includes(id));

    if (uniqueIds.length === 0) { setFriends([]); return; }

    const profiles: Friend[] = [];
    for (const fid of uniqueIds) {
      const { data: p } = await supabase.from("profiles").select("user_id, full_name, avatar_url").eq("user_id", fid).single();
      if (p) profiles.push(p as Friend);
    }
    setFriends(profiles);
  };

  const toggleFriend = (userId: string) => {
    setSelected(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const handleAdd = async () => {
    if (selected.length === 0) return;
    setAdding(true);
    for (const friendId of selected) {
      await supabase.from("group_members").insert({
        group_id: groupId,
        user_id: friendId,
        role: "member",
      });
    }
    toast({ title: `Added ${selected.length} member(s)` });
    setAdding(false);
    setOpen(false);
    setSelected([]);
    onMembersAdded?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 w-full">
          <UserPlus className="h-4 w-4" /> Add Members
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" /> Add Friends to Group
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2 max-h-64 overflow-y-auto">
          {friends.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No friends available to add.</p>
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
        {friends.length > 0 && (
          <Button onClick={handleAdd} className="w-full bg-gradient-primary text-white" disabled={adding || selected.length === 0}>
            {adding ? "Adding..." : `Add ${selected.length} Member(s)`}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddGroupMembersDialog;
