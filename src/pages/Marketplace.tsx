import { useState } from "react";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, Grid3X3, List, MapPin, Tag, BookOpen, Laptop, Wrench, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

const MOCK_ITEMS = [
  { id: "1", title: "Calculus Textbook (8th Ed)", category: "Books", price: 25, type: "Sell", condition: "Good", location: "Campus A", image: "📘" },
  { id: "2", title: "Arduino Starter Kit", category: "Electronics", price: 40, type: "Sell", condition: "Like New", location: "Campus B", image: "🔧" },
  { id: "3", title: "Organic Chemistry Notes", category: "Study Materials", price: 0, type: "Share", condition: "Digital", location: "Online", image: "📝" },
  { id: "4", title: "Scientific Calculator TI-84", category: "Electronics", price: 55, type: "Sell", condition: "Good", location: "Campus A", image: "🔢" },
  { id: "5", title: "Physics Lab Manual", category: "Books", price: 10, type: "Exchange", condition: "Fair", location: "Campus C", image: "📗" },
  { id: "6", title: "Laptop Stand (Adjustable)", category: "Tools", price: 20, type: "Sell", condition: "Like New", location: "Campus B", image: "💻" },
  { id: "7", title: "Data Structures & Algorithms", category: "Books", price: 0, type: "Share", condition: "Good", location: "Online", image: "📕" },
  { id: "8", title: "Drawing Tablet Wacom", category: "Electronics", price: 80, type: "Sell", condition: "Good", location: "Campus A", image: "🎨" },
];

const CATEGORIES = ["All", "Books", "Electronics", "Tools", "Study Materials"];
const TYPES = ["All", "Sell", "Exchange", "Share"];

const Marketplace = () => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [type, setType] = useState("All");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = MOCK_ITEMS.filter((item) => {
    const matchSearch = item.title.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "All" || item.category === category;
    const matchType = type === "All" || item.type === type;
    return matchSearch && matchCat && matchType;
  });

  return (
    <div className="min-h-screen pt-20 px-4">
      <div className="container mx-auto">
        <motion.h1
          className="font-heading text-3xl sm:text-4xl font-bold mb-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        >
          Browse <span className="text-gradient">Resources</span>
        </motion.h1>

        {/* Search bar */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search books, electronics, tools..."
              className="pl-10 bg-card border-border"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" onClick={() => setShowFilters(!showFilters)}>
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
          <Button variant={view === "grid" ? "default" : "outline"} size="icon" onClick={() => setView("grid")}>
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button variant={view === "list" ? "default" : "outline"} size="icon" onClick={() => setView("list")}>
            <List className="h-4 w-4" />
          </Button>
        </div>

        {/* Filters */}
        {showFilters && (
          <motion.div className="flex flex-wrap gap-3 mb-6 glass rounded-xl p-4" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-40 bg-card"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-40 bg-card"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </motion.div>
        )}

        {/* Results */}
        <p className="text-sm text-muted-foreground mb-4">{filtered.length} resources found</p>

        <div className={view === "grid"
          ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          : "space-y-3"
        }>
          {filtered.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link to={`/resource/${item.id}`}>
                {view === "grid" ? (
                  <div className="glass rounded-xl overflow-hidden hover:shadow-glow transition-all group cursor-pointer">
                    <div className="h-40 bg-secondary flex items-center justify-center text-5xl group-hover:scale-105 transition-transform">
                      {item.image}
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="secondary" className="text-xs">{item.type}</Badge>
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{item.location}
                        </span>
                      </div>
                      <h3 className="font-heading font-semibold text-sm mb-1 line-clamp-2">{item.title}</h3>
                      <div className="flex items-center justify-between">
                        <span className="font-heading font-bold text-primary">
                          {item.price === 0 ? "Free" : `$${item.price}`}
                        </span>
                        <span className="text-xs text-muted-foreground">{item.condition}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="glass rounded-xl p-4 flex gap-4 hover:shadow-glow transition-all cursor-pointer">
                    <div className="h-16 w-16 bg-secondary rounded-lg flex items-center justify-center text-3xl shrink-0">
                      {item.image}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-heading font-semibold text-sm truncate">{item.title}</h3>
                        <Badge variant="secondary" className="text-xs shrink-0">{item.type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.category} · {item.condition} · {item.location}</p>
                    </div>
                    <span className="font-heading font-bold text-primary shrink-0">
                      {item.price === 0 ? "Free" : `$${item.price}`}
                    </span>
                  </div>
                )}
              </Link>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <p>No resources found. Try adjusting your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Marketplace;
