import { useEffect, useState } from "react";
import { useAdmin } from "@/contexts/AdminContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Loader2, Upload, Megaphone } from "lucide-react";

interface Ad {
  id: string;
  title: string;
  body: string | null;
  media_url: string | null;
  media_type: string;
  link_url: string | null;
  is_active: boolean;
  created_at: string;
}

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const res = r.result as string;
      resolve(res.split(",")[1] || "");
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });

const AdminAdvertisements = () => {
  const { adminRequest } = useAdmin();
  const { toast } = useToast();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [mediaType, setMediaType] = useState<"text" | "image" | "video">("text");
  const [mediaUrl, setMediaUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setAds(await adminRequest("getAdvertisements")); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleUpload = async (file: File) => {
    if (file.size > 25 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 25MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const fileBase64 = await fileToBase64(file);
      const res = await adminRequest("uploadAdMedia", {
        fileBase64, fileName: file.name, contentType: file.type,
      });
      setMediaUrl(res.url);
      toast({ title: "Uploaded", description: "Media ready to attach" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally { setUploading(false); }
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await adminRequest("createAdvertisement", {
        title: title.trim(),
        adBody: body.trim(),
        media_url: mediaUrl || null,
        media_type: mediaType,
        link_url: linkUrl.trim() || null,
      });
      setTitle(""); setBody(""); setLinkUrl(""); setMediaUrl(""); setMediaType("text");
      toast({ title: "Advertisement published" });
      load();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  const toggle = async (ad: Ad) => {
    await adminRequest("toggleAdvertisement", { adId: ad.id, isActive: !ad.is_active });
    load();
  };

  const remove = async (ad: Ad) => {
    if (!confirm(`Delete "${ad.title}"?`)) return;
    await adminRequest("deleteAdvertisement", { adId: ad.id });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Megaphone className="h-5 w-5 text-primary" />
        <h1 className="font-heading text-2xl font-bold">Advertisements</h1>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Create New Ad</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="Body text (optional)" value={body} onChange={(e) => setBody(e.target.value)} rows={2} />
          <Input placeholder="Click-through URL (optional)" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select value={mediaType} onValueChange={(v: any) => setMediaType(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text only</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="video">Video</SelectItem>
              </SelectContent>
            </Select>
            {mediaType !== "text" && (
              <label className="flex items-center justify-center gap-2 border border-dashed border-border rounded-md px-3 py-2 cursor-pointer hover:bg-muted/50 text-sm">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {mediaUrl ? "Replace media" : `Upload ${mediaType}`}
                <input type="file" className="hidden"
                  accept={mediaType === "image" ? "image/*" : "video/*"}
                  onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
              </label>
            )}
          </div>
          {mediaUrl && (
            <div className="text-xs text-muted-foreground break-all bg-muted/40 rounded px-2 py-1">{mediaUrl}</div>
          )}
          <Button onClick={handleCreate} disabled={submitting || !title.trim() || (mediaType !== "text" && !mediaUrl)} className="w-full sm:w-auto">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publish Ad"}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="font-semibold text-sm text-muted-foreground">Existing Ads</h2>
        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : ads.length === 0 ? (
          <p className="text-sm text-muted-foreground">No advertisements yet.</p>
        ) : (
          ads.map((ad) => (
            <Card key={ad.id}>
              <CardContent className="p-4 flex items-start gap-3">
                {ad.media_type === "image" && ad.media_url && <img src={ad.media_url} alt="" className="h-14 w-14 rounded object-cover" />}
                {ad.media_type === "video" && ad.media_url && <video src={ad.media_url} muted className="h-14 w-20 rounded object-cover" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold truncate">{ad.title}</p>
                    <Badge variant="outline" className="text-xs uppercase">{ad.media_type}</Badge>
                    {!ad.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                  </div>
                  {ad.body && <p className="text-sm text-muted-foreground line-clamp-2">{ad.body}</p>}
                  {ad.link_url && <p className="text-xs text-primary truncate">{ad.link_url}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch checked={ad.is_active} onCheckedChange={() => toggle(ad)} />
                  <Button variant="ghost" size="icon" onClick={() => remove(ad)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminAdvertisements;
