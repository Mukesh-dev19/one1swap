import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Package, MessageSquare, ArrowUpDown, TrendingUp, Bookmark, Trash2, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface Resource {
  id: string;
  title: string;
  price: number;
  type: string;
  images: string[];
  status: string | null;
}

interface SavedItem {
  id: string;
  resource_id: string;
  resources?: Resource;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ listings: 0, messages: 0, requests: 0, saved: 0 });
  const [myListings, setMyListings] = useState<Resource[]>([]);
  const [savedItems, setSavedItems] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"listings" | "saved" | "activity">("listings");

  useEffect(() => {
    if (user) {
      fetchStats();
      fetchMyListings();
      fetchSavedItems();
    }
  }, [user]);

  const fetchStats = async () => {
    const [{ count: listings }, { count: messages }, { count: requests }, { count: saved }] = await Promise.all([
      supabase.from("resources").select("*", { count: "exact", head: true }).eq("user_id", user!.id),
      supabase.from("messages").select("*", { count: "exact", head: true }).or(`sender_id.eq.${user!.id},receiver_id.eq.${user!.id}`),
      supabase.from("resource_requests").select("*", { count: "exact", head: true }).eq("user_id", user!.id),
      supabase.from("saved_items").select("*", { count: "exact", head: true }).eq("user_id", user!.id),
    ]);
    setStats({ listings: listings || 0, messages: messages || 0, requests: requests || 0, saved: saved || 0 });
  };

  const fetchMyListings = async () => {
    const { data } = await supabase.from("resources").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
    if (data) setMyListings(data as Resource[]);
  };

  const fetchSavedItems = async () => {
    const { data } = await supabase.from("saved_items").select("*, resources(*)").eq("user_id", user!.id);
    if (data) setSavedItems(data);
  };

  const handleDeleteListing = async (id: string) => {
    const { error } = await supabase.from("resources").delete().eq("id", id);
    if (!error) {
      setMyListings((prev) => prev.filter((r) => r.id !== id));
      toast({ title: "Listing deleted" });
    }
  };

  const handleUnsave = async (savedId: string) => {
    await supabase.from("saved_items").delete().eq("id", savedId);
    setSavedItems((prev) => prev.filter((s) => s.id !== savedId));
    toast({ title: "Removed from saved" });
  };

  const statCards = [
    { icon: Package, label: "My Listings", value: stats.listings, color: "text-primary" },
    { icon: MessageSquare, label: "Messages", value: stats.messages, color: "text-accent" },
    { icon: ArrowUpDown, label: "Requests Sent", value: stats.requests, color: "text-primary" },
    { icon: Bookmark, label: "Saved Items", value: stats.saved, color: "text-accent" },
  ];

  const tabs = [
    { key: "listings" as const, label: "My Uploads", icon: Package },
    { key: "saved" as const, label: "Saved Items", icon: Heart },
    { key: "activity" as const, label: "Activity", icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen pt-16 px-4 pb-8">
      <div className="container mx-auto max-w-5xl pt-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-heading text-3xl font-bold mb-2">
            <span className="text-gradient">Dashboard</span>
          </h1>
          <p className="text-muted-foreground mb-8">Your OneSwap activity at a glance.</p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {statCards.map((s, i) => (
            <motion.div
              key={s.label}
              className="bg-card rounded-2xl p-5 shadow-soft border border-border/50"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            >
              <s.icon className={`h-5 w-5 ${s.color} mb-2`} />
              <p className="font-heading text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? "default" : "outline"}
              className={`gap-2 rounded-full ${activeTab === tab.key ? "bg-gradient-primary text-white" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <tab.icon className="h-4 w-4" /> {tab.label}
            </Button>
          ))}
        </div>

        {/* Listings tab */}
        {activeTab === "listings" && (
          <div className="space-y-3">
            {myListings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>You haven't listed anything yet.</p>
                <Link to="/upload"><Button className="mt-3 bg-gradient-primary text-white rounded-xl">Upload Resource</Button></Link>
              </div>
            ) : (
              myListings.map((item) => (
                <motion.div key={item.id} className="bg-card rounded-2xl p-4 flex items-center gap-4 shadow-soft border border-border/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="h-14 w-14 rounded-xl bg-muted overflow-hidden shrink-0">
                    {item.images && item.images.length > 0 ? (
                      <img src={item.images[0]} alt={item.title} className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex items-center justify-center h-full text-2xl">📦</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link to={`/resource/${item.id}`} className="font-semibold text-sm hover:text-primary truncate block">{item.title}</Link>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className="text-xs bg-gradient-primary text-white border-0">{item.type}</Badge>
                      {item.status === "sold" && <Badge variant="destructive" className="text-xs">Sold</Badge>}
                      <span className="text-sm font-bold text-primary">{item.price === 0 ? "Free" : `₹${item.price}`}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => handleDeleteListing(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Saved tab */}
        {activeTab === "saved" && (
          <div className="space-y-3">
            {savedItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bookmark className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p>No saved items yet. Browse the marketplace!</p>
              </div>
            ) : (
              savedItems.map((item) => (
                <motion.div key={item.id} className="bg-card rounded-2xl p-4 flex items-center gap-4 shadow-soft border border-border/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="h-14 w-14 rounded-xl bg-muted overflow-hidden shrink-0">
                    {item.resources?.images?.[0] ? (
                      <img src={item.resources.images[0]} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex items-center justify-center h-full text-2xl">📦</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link to={`/resource/${item.resource_id}`} className="font-semibold text-sm hover:text-primary truncate block">
                      {item.resources?.title || "Resource"}
                    </Link>
                    <span className="text-sm font-bold text-primary">
                      {item.resources?.price === 0 ? "Free" : `₹${item.resources?.price}`}
                    </span>
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => handleUnsave(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Activity tab */}
        {activeTab === "activity" && (
          <motion.div className="bg-card rounded-2xl p-6 shadow-soft border border-border/50" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="font-heading font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" /> Quick Actions
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <Link to="/upload"><Button className="w-full bg-gradient-primary font-semibold justify-start gap-2 text-white rounded-xl"><Package className="h-4 w-4" /> Upload New Resource</Button></Link>
              <Link to="/marketplace"><Button variant="outline" className="w-full justify-start gap-2 rounded-xl"><TrendingUp className="h-4 w-4" /> Browse Marketplace</Button></Link>
              <Link to="/messages"><Button variant="outline" className="w-full justify-start gap-2 rounded-xl"><MessageSquare className="h-4 w-4" /> Check Messages</Button></Link>
              <Link to="/profile"><Button variant="outline" className="w-full justify-start gap-2 rounded-xl"><ArrowUpDown className="h-4 w-4" /> View Profile</Button></Link>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
