import { motion } from "framer-motion";
import { Package, MessageSquare, ArrowUpDown, TrendingUp, Recycle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const stats = [
  { icon: Package, label: "Active Listings", value: "5", color: "text-primary" },
  { icon: MessageSquare, label: "Messages", value: "12", color: "text-accent" },
  { icon: ArrowUpDown, label: "Exchanges", value: "8", color: "text-primary" },
  { icon: Recycle, label: "Items Recycled", value: "15", color: "text-accent" },
];

const recentActivity = [
  { text: "Listed 'Calculus Textbook' for $25", time: "2 hours ago" },
  { text: "Received request from Sarah K.", time: "5 hours ago" },
  { text: "Completed exchange with James L.", time: "1 day ago" },
  { text: "Updated 'Arduino Kit' price to $40", time: "2 days ago" },
];

const Dashboard = () => {
  return (
    <div className="min-h-screen pt-20 px-4">
      <div className="container mx-auto max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-heading text-3xl font-bold mb-2">
            <span className="text-gradient">Dashboard</span>
          </h1>
          <p className="text-muted-foreground mb-8">Your OneSwap activity at a glance.</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              className="glass rounded-xl p-5"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            >
              <s.icon className={`h-6 w-6 ${s.color} mb-2`} />
              <p className="font-heading text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <motion.div className="glass rounded-xl p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <h2 className="font-heading font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" /> Recent Activity
            </h2>
            <div className="space-y-3">
              {recentActivity.map((a, i) => (
                <div key={i} className="flex items-start gap-3 pb-3 border-b border-border/30 last:border-0">
                  <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
                  <div>
                    <p className="text-sm">{a.text}</p>
                    <p className="text-xs text-muted-foreground">{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div className="glass rounded-xl p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <h2 className="font-heading font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link to="/upload"><Button className="w-full bg-gradient-primary font-semibold justify-start gap-2"><Package className="h-4 w-4" /> Upload New Resource</Button></Link>
              <Link to="/marketplace"><Button variant="outline" className="w-full justify-start gap-2"><TrendingUp className="h-4 w-4" /> Browse Marketplace</Button></Link>
              <Link to="/messages"><Button variant="outline" className="w-full justify-start gap-2"><MessageSquare className="h-4 w-4" /> Check Messages</Button></Link>
              <Link to="/profile"><Button variant="outline" className="w-full justify-start gap-2"><Recycle className="h-4 w-4" /> View Profile</Button></Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
