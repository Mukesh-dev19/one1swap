import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, Megaphone } from "lucide-react";

interface Ad {
  id: string;
  title: string;
  body: string | null;
  media_url: string | null;
  media_type: string;
  link_url: string | null;
}

const AdvertisementBanner = () => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [idx, setIdx] = useState(0);
  const [hidden, setHidden] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(sessionStorage.getItem("hiddenAds") || "[]")); }
    catch { return new Set(); }
  });

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("advertisements")
        .select("id,title,body,media_url,media_type,link_url")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (data) setAds(data as Ad[]);
    };
    load();
    const ch = supabase
      .channel("ads-banner")
      .on("postgres_changes", { event: "*", schema: "public", table: "advertisements" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const visible = ads.filter((a) => !hidden.has(a.id));

  useEffect(() => {
    if (visible.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % visible.length), 6000);
    return () => clearInterval(t);
  }, [visible.length]);

  if (visible.length === 0) return null;
  const ad = visible[idx % visible.length];
  if (!ad) return null;

  const dismiss = (id: string) => {
    const next = new Set(hidden); next.add(id);
    setHidden(next);
    sessionStorage.setItem("hiddenAds", JSON.stringify([...next]));
  };

  const inner = (
    <div className="flex items-center gap-3 px-3 py-2">
      <Megaphone className="h-4 w-4 shrink-0 opacity-80" />
      {ad.media_type === "image" && ad.media_url && (
        <img src={ad.media_url} alt={ad.title} className="h-10 w-10 rounded-md object-cover shrink-0" />
      )}
      {ad.media_type === "video" && ad.media_url && (
        <video src={ad.media_url} muted autoPlay loop playsInline className="h-10 w-16 rounded-md object-cover shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight truncate">{ad.title}</p>
        {ad.body && <p className="text-xs opacity-90 leading-snug line-clamp-1">{ad.body}</p>}
      </div>
    </div>
  );

  return (
    <div className="sticky top-14 z-30 w-full bg-gradient-to-r from-primary/15 via-primary/10 to-accent/15 border-b border-primary/20 backdrop-blur-md text-foreground">
      <div className="container mx-auto flex items-center gap-1">
        {ad.link_url ? (
          <a href={ad.link_url} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0 hover:opacity-90 transition-opacity">{inner}</a>
        ) : (
          <div className="flex-1 min-w-0">{inner}</div>
        )}
        {visible.length > 1 && (
          <div className="flex gap-1 pr-1">
            {visible.map((_, i) => (
              <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === idx % visible.length ? "bg-primary" : "bg-primary/30"}`} />
            ))}
          </div>
        )}
        <button onClick={() => dismiss(ad.id)} className="p-2 opacity-60 hover:opacity-100" aria-label="Dismiss">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default AdvertisementBanner;
