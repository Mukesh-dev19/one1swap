import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Grid3X3, List, MapPin, Bookmark, BookmarkCheck, FileText, Plus, Package, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface Resource {
  id: string;
  title: string;
  category: string;
  price: number;
  type: string;
  condition: string | null;
  location: string | null;
  images: string[];
  files: string[] | null;
  description: string | null;
  created_at: string;
  user_id: string;
  status: string | null;
}

const CATEGORIES = ["All", "Books", "Electronics", "Tools", "Study Materials", "Notes & PDFs"];
const TYPES = ["All", "Sell", "Exchange", "Share"];

const TYPE_COLORS: Record<string, string> = {
  Sell: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  Exchange: "bg-amber-500/10 text-amber-600 border-amber-200",
  Share: "bg-sky-500/10 text-sky-600 border-sky-200",
};

const Resources = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [type, setType] = useState("All");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [resources, setResources] = useState<Resource[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResources();
    if (user) fetchSavedIds();
  }, [user]);

  const fetchResources = async () => {
    const { data, error } = await supabase
      .from("resources")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setResources((data as Resource[]).filter((r) => r.status !== "sold"));
    setLoading(false);
  };

  const fetchSavedIds = async () => {
    if (!user) return;
    const { data } = await supabase.from("saved_items").select("resource_id").eq("user_id", user.id);
    if (data) setSavedIds(new Set(data.map((d) => d.resource_id)));
  };

  const toggleSave = async (resourceId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    if (savedIds.has(resourceId)) {
      await supabase.from("saved_items").delete().eq("user_id", user.id).eq("resource_id", resourceId);
      setSavedIds((prev) => { const n = new Set(prev); n.delete(resourceId); return n; });
      toast({ title: "Removed from saved" });
    } else {
      await supabase.from("saved_items").insert({ user_id: user.id, resource_id: resourceId });
      setSavedIds((prev) => new Set(prev).add(resourceId));
      toast({ title: "Saved! 💾" });
    }
  };

  const filtered = resources.filter((item) => {
    const matchSearch = item.title.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "All" || item.category === category;
    const matchType = type === "All" || item.type === type;
    return matchSearch && matchCat && matchType;
  });

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="min-h-screen pt-16 pb-24">
      <div className="container mx-auto max-w-7xl px-4">
        {/* Header */}
        <motion.div
          className="pt-6 pb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-heading text-3xl sm:text-4xl font-bold mb-1">
            Campus <span className="text-gradient">Marketplace</span>
          </h1>
          <p className="text-muted-foreground text-sm">
            {filtered.length} resources available from students near you
          </p>
        </motion.div>

        {/* Search & Controls */}
        <div className="sticky top-16 z-20 bg-background/95 backdrop-blur-md pb-3 pt-1 -mx-4 px-4 border-b border-border/30">
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search resources..."
                className="pl-10 rounded-full h-10 bg-card border-border/50"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-1 bg-card rounded-full p-1 border border-border/50">
              <button
                onClick={() => setView("grid")}
                className={`p-2 rounded-full transition-colors ${view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView("list")}
                className={`p-2 rounded-full transition-colors ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Category pills */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                  category === c
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-card text-muted-foreground hover:text-foreground border border-border/50"
                }`}
              >
                {c}
              </button>
            ))}
            <div className="w-px bg-border/50 shrink-0 mx-1" />
            {TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                  type === t
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "bg-card text-muted-foreground hover:text-foreground border border-border/50"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-card rounded-2xl overflow-hidden border border-border/30 animate-pulse">
                <div className="h-40 bg-muted" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-muted rounded w-2/3" />
                  <div className="h-4 bg-muted rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            className="text-center py-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
            <p className="font-heading font-semibold text-lg text-foreground mb-1">No resources found</p>
            <p className="text-sm text-muted-foreground mb-4">Try adjusting your filters or be the first to upload!</p>
            <Link to="/upload">
              <Button className="bg-gradient-primary text-white rounded-full gap-2">
                <Plus className="h-4 w-4" /> Upload Resource
              </Button>
            </Link>
          </motion.div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
            <AnimatePresence mode="popLayout">
              {filtered.map((item, i) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Link to={`/resource/${item.id}`} className="block group">
                    <div className="bg-card rounded-2xl overflow-hidden border border-border/30 hover:border-primary/30 hover:shadow-glow transition-all duration-300">
                      {/* Image */}
                      <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                        {item.images && item.images.length > 0 ? (
                          <img
                            src={item.images[0]}
                            alt={item.title}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                            <Package className="h-10 w-10 text-muted-foreground/30" />
                          </div>
                        )}

                        {/* Overlays */}
                        <div className="absolute top-2 left-2 flex gap-1.5">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${TYPE_COLORS[item.type] || "bg-muted text-muted-foreground"}`}>
                            {item.type}
                          </span>
                          {item.files && item.files.length > 0 && (
                            <span className="bg-card/90 backdrop-blur-sm text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-0.5">
                              <FileText className="h-2.5 w-2.5 text-primary" /> PDF
                            </span>
                          )}
                        </div>

                        <button
                          className={`absolute top-2 right-2 h-7 w-7 rounded-full flex items-center justify-center transition-all ${
                            savedIds.has(item.id)
                              ? "bg-primary text-primary-foreground"
                              : "bg-card/80 backdrop-blur-sm text-muted-foreground hover:text-primary"
                          }`}
                          onClick={(e) => toggleSave(item.id, e)}
                        >
                          {savedIds.has(item.id) ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                        </button>
                      </div>

                      {/* Info */}
                      <div className="p-3">
                        <h3 className="font-medium text-sm line-clamp-2 leading-snug mb-2 group-hover:text-primary transition-colors">
                          {item.title}
                        </h3>
                        <div className="flex items-end justify-between">
                          <span className="font-heading font-bold text-lg text-primary leading-none">
                            {item.price === 0 ? "Free" : `₹${item.price}`}
                          </span>
                          <div className="flex flex-col items-end gap-0.5">
                            {item.location && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <MapPin className="h-2.5 w-2.5" />{item.location}
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground">{timeAgo(item.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="space-y-2 mt-4">
            {filtered.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Link to={`/resource/${item.id}`}>
                  <div className="bg-card rounded-xl p-3 flex gap-3 border border-border/30 hover:border-primary/30 hover:shadow-sm transition-all group">
                    <div className="h-16 w-16 bg-muted rounded-xl shrink-0 overflow-hidden">
                      {item.images && item.images.length > 0 ? (
                        <img src={item.images[0]} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-medium text-sm truncate group-hover:text-primary transition-colors">{item.title}</h3>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border shrink-0 ${TYPE_COLORS[item.type] || ""}`}>
                          {item.type}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.category} · {item.condition || "N/A"} · {timeAgo(item.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-heading font-bold text-primary">
                        {item.price === 0 ? "Free" : `₹${item.price}`}
                      </span>
                      <button
                        className={`transition-colors ${savedIds.has(item.id) ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
                        onClick={(e) => toggleSave(item.id, e)}
                      >
                        {savedIds.has(item.id) ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Upload FAB */}
      <Link to="/upload" className="fixed bottom-6 right-6 z-40">
        <Button className="h-14 w-14 rounded-full bg-gradient-primary text-white shadow-glow hover:scale-110 transition-transform p-0">
          <Plus className="h-6 w-6" />
        </Button>
      </Link>
    </div>
  );
};

export default Resources;
