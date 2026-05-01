import { useEffect, useState } from "react";
import { useAdmin } from "@/contexts/AdminContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Megaphone, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: string;
  is_active: boolean;
  created_at: string;
}

const AdminAnnouncements = () => {
  const { adminRequest } = useAdmin();
  const { toast } = useToast();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info");

  const fetchItems = async () => {
    setLoading(true);
    try {
      const data = await adminRequest("getAnnouncements");
      setItems(data || []);
    } catch {
      toast({ title: "Error", description: "Failed to load announcements", variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const handleCreate = async () => {
    if (!title.trim() || !message.trim()) return;
    setSubmitting(true);
    try {
      await adminRequest("createAnnouncement", { title, message, type });
      setTitle(""); setMessage(""); setType("info");
      toast({ title: "Announcement published 📢" });
      fetchItems();
    } catch {
      toast({ title: "Error", description: "Failed to publish", variant: "destructive" });
    }
    setSubmitting(false);
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    await adminRequest("toggleAnnouncement", { announcementId: id, isActive });
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    await adminRequest("deleteAnnouncement", { announcementId: id });
    toast({ title: "Deleted" });
    fetchItems();
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" /> Announcements
        </h1>
        <p className="text-sm text-muted-foreground">Broadcast messages to all platform users.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Create new announcement</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="Message" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />
          <div className="flex flex-wrap items-center gap-3">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="success">Success</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleCreate} disabled={submitting || !title.trim() || !message.trim()}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publish"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">All announcements</h2>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No announcements yet.</p>
        ) : (
          items.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-sm">{a.title}</span>
                    <Badge variant="outline" className="text-[10px] capitalize">{a.type}</Badge>
                    {!a.is_active && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{a.message}</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">{new Date(a.created_at).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch checked={a.is_active} onCheckedChange={(v) => handleToggle(a.id, v)} />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete announcement?</AlertDialogTitle>
                        <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(a.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminAnnouncements;
