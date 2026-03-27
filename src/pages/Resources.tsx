import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, Grid3X3, List, MapPin, Bookmark, BookmarkCheck, FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const Resources = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [type, setType] = useState("All");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
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

  return (
    <div className="min-h-screen pt-16 px-4 pb-8">
      <div className="container mx-auto">
        <motion.h1
          className="font-heading text-3xl sm:text-4xl font-bold mb-2 pt-4"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        >
          Browse <span className="text-gradient">Resources</span>
        </motion.h1>
        <p className="text-muted-foreground mb-6">Discover books, notes, electronics and more shared by students.</p>

        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search books, electronics, notes..." className="pl-10 rounded-full" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" size="icon" className="rounded-full" onClick={() => setShowFilters(!showFilters)}>
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
          <Button variant={view === "grid" ? "default" : "outline"} size="icon" className={`rounded-full ${view === "grid" ? "bg-gradient-primary text-white" : ""}`} onClick={() => setView("grid")}>
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button variant={view === "list" ? "default" : "outline"} size="icon" className={`rounded-full ${view === "list" ? "bg-gradient-primary text-white" : ""}`} onClick={() => setView("list")}>
            <List className="h-4 w-4" />
          </Button>
        </div>

        {showFilters && (
          <motion.div className="flex flex-wrap gap-3 mb-6 bg-card rounded-2xl p-4 shadow-soft border border-border/50" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-40 rounded-full"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-40 rounded-full"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </motion.div>
        )}

        <p className="text-sm text-muted-foreground mb-4">{filtered.length} resources found</p>

        {loading ? (
          <div className="text-center py-20 text-muted-foreground">Loading resources...</div>
        ) : (
          <div className={view === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" : "space-y-3"}>
            {filtered.map((item, i) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Link to={`/resource/${item.id}`}>
                  {view === "grid" ? (
                    <div className="bg-card rounded-2xl overflow-hidden shadow-soft hover:shadow-glow transition-all group cursor-pointer border border-border/50">
                      <div className="h-48 bg-muted flex items-center justify-center overflow-hidden relative">
                        {item.images && item.images.length > 0 ? (
                          <img src={item.images[0]} alt={item.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                        ) : (
                          <span className="text-5xl">📦</span>
                        )}
                        {item.files && item.files.length > 0 && (
                          <div className="absolute top-2 left-2 bg-card/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
                            <FileText className="h-3 w-3 text-primary" />
                            <span className="text-xs font-medium">PDF</span>
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Badge className="text-xs bg-gradient-primary text-white border-0">{item.type}</Badge>
                          <button className={`transition-colors ${savedIds.has(item.id) ? "text-primary" : "text-muted-foreground hover:text-primary"}`} onClick={(e) => toggleSave(item.id, e)}>
                            {savedIds.has(item.id) ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                          </button>
                        </div>
                        <h3 className="font-heading font-semibold text-sm mb-1 line-clamp-2">{item.title}</h3>
                        <div className="flex items-center justify-between">
                          <span className="font-heading font-bold text-primary text-lg">
                            {item.price === 0 ? "Free" : `₹${item.price}`}
                          </span>
                          {item.location && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />{item.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-card rounded-2xl p-4 flex gap-4 shadow-soft hover:shadow-glow transition-all cursor-pointer border border-border/50">
                      <div className="h-16 w-16 bg-muted rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                        {item.images && item.images.length > 0 ? (
                          <img src={item.images[0]} alt={item.title} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-3xl">📦</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-heading font-semibold text-sm truncate">{item.title}</h3>
                          <Badge className="text-xs bg-gradient-primary text-white border-0 shrink-0">{item.type}</Badge>
                          {item.files && item.files.length > 0 && (
                            <Badge variant="outline" className="text-xs shrink-0"><FileText className="h-3 w-3 mr-1" />PDF</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{item.category} · {item.condition} · {item.location}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-heading font-bold text-primary">
                          {item.price === 0 ? "Free" : `₹${item.price}`}
                        </span>
                        <button className={`transition-colors ${savedIds.has(item.id) ? "text-primary" : "text-muted-foreground"}`} onClick={(e) => toggleSave(item.id, e)}>
                          {savedIds.has(item.id) ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  )}
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <p className="font-heading font-semibold text-lg mb-2">No resources yet</p>
            <p className="text-sm">Be the first to upload a resource!</p>
            <Link to="/upload">
              <Button className="mt-4 bg-gradient-primary text-white">Upload Resource</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Resources;
