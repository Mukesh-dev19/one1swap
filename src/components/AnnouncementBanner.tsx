import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { X, AlertTriangle, CheckCircle2, Info } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: string;
  target_college: string | null;
  target_department: string | null;
}

const TYPE_STYLES: Record<string, { bg: string; icon: any }> = {
  info: { bg: "bg-primary/10 border-primary/30 text-primary", icon: Info },
  warning: { bg: "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400", icon: AlertTriangle },
  success: { bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400", icon: CheckCircle2 },
};

const norm = (s: string | null | undefined) => (s || "").trim().toLowerCase();

const AnnouncementBanner = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [profile, setProfile] = useState<{ college: string | null; department: string | null } | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("dismissedAnnouncements") || "[]"));
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) { setProfile(null); return; }
      const { data } = await supabase.from("profiles").select("college, department").eq("user_id", user.id).maybeSingle();
      setProfile(data || { college: null, department: null });
    };
    loadProfile();
  }, [user?.id]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("announcements")
        .select("id,title,message,type,target_college,target_department")
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

  const matchesAudience = (a: Announcement) => {
    const hasCollege = !!a.target_college;
    const hasDept = !!a.target_department;
    if (!hasCollege && !hasDept) return true; // global
    if (!user) return false; // targeted requires login
    if (hasCollege && norm(a.target_college) !== norm(profile?.college)) return false;
    if (hasDept && norm(a.target_department) !== norm(profile?.department)) return false;
    return true;
  };

  const visible = announcements.filter((a) => !dismissed.has(a.id) && matchesAudience(a));
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
