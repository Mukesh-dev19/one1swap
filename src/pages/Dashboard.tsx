import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Package, MessageSquare, ArrowUpDown, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ listings: 0, messages: 0, requests: 0 });

  useEffect(() => {
    if (user) fetchStats();
  }, [user]);

  const fetchStats = async () => {
    const [{ count: listings }, { count: messages }, { count: requests }] = await Promise.all([
      supabase.from("resources").select("*", { count: "exact", head: true }).eq("user_id", user!.id),
      supabase.from("messages").select("*", { count: "exact", head: true }).or(`sender_id.eq.${user!.id},receiver_id.eq.${user!.id}`),
      supabase.from("resource_requests").select("*", { count: "exact", head: true }).eq("user_id", user!.id),
    ]);
    setStats({ listings: listings || 0, messages: messages || 0, requests: requests || 0 });
  };

  const statCards = [
    { icon: Package, label: "Active Listings", value: stats.listings, color: "text-primary" },
    { icon: MessageSquare, label: "Messages", value: stats.messages, color: "text-accent" },
    { icon: ArrowUpDown, label: "Requests Sent", value: stats.requests, color: "text-primary" },
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {statCards.map((s, i) => (
            <motion.div
              key={s.label}
              className="bg-card rounded-2xl p-6 shadow-soft border border-border/50"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            >
              <s.icon className={`h-6 w-6 ${s.color} mb-2`} />
              <p className="font-heading text-3xl font-bold">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>

        <motion.div className="bg-card rounded-2xl p-6 shadow-soft border border-border/50" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
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
      </div>
    </div>
  );
};

export default Dashboard;
