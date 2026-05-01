import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, X, AlertTriangle, CheckCircle2, Info } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: string;
}

const TYPE_STYLES: Record<string, { bg: string; icon: any }> = {
  info: { bg: "bg-primary/10 border-primary/30 text-primary", icon: Info },
  warning: { bg: "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400", icon: AlertTriangle },
  success: { bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400", icon: CheckCircle2 },
};

const AnnouncementBanner = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("dismissedAnnouncements") || "[]"));
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("announcements")
        .select("id,title,message,type")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (data) setAnnouncements(data as Announcement[]);
    };
    fetch();
    const channel = supabase
      .channel("announcements-banner")
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, fetch)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleDismiss = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    localStorage.setItem("dismissedAnnouncements", JSON.stringify([...next]));
  };

  const visible = announcements.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="fixed top-14 left-0 right-0 z-40 px-2 pt-2 space-y-1.5 pointer-events-none">
      {visible.slice(0, 2).map((a) => {
        const style = TYPE_STYLES[a.type] || TYPE_STYLES.info;
        const Icon = style.icon;
        return (
          <div
            key={a.id}
            className={`pointer-events-auto container mx-auto flex items-start gap-2 rounded-xl border px-3 py-2 backdrop-blur-md ${style.bg}`}
          >
            <Icon className="h-4 w-4 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">{a.title}</p>
              <p className="text-xs opacity-90 leading-snug">{a.message}</p>
            </div>
            <button onClick={() => handleDismiss(a.id)} className="opacity-60 hover:opacity-100 shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default AnnouncementBanner;
