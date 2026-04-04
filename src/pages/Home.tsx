import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Search, MessageSquare, LayoutDashboard, User, BookOpen, Sparkles, Upload } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo.jpeg";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5 } }),
};

const quickActions = [
  {
    to: "/messages",
    icon: MessageSquare,
    title: "Messages",
    desc: "Chat with students, share files & media",
    gradient: "from-sky-500 to-blue-600",
  },
  {
    to: "/resources",
    icon: Search,
    title: "Browse Resources",
    desc: "Find books, notes, electronics & more",
    gradient: "from-blue-500 to-indigo-500",
  },
  {
    to: "/upload",
    icon: Upload,
    title: "Upload Resource",
    desc: "Share your items with the campus",
    gradient: "from-indigo-500 to-blue-600",
  },
  {
    to: "/dashboard",
    icon: LayoutDashboard,
    title: "Dashboard",
    desc: "Track your uploads, saves & activity",
    gradient: "from-cyan-500 to-blue-500",
  },
];

const Home = () => {
  const { user } = useAuth();
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "there";

  return (
    <div className="min-h-screen pt-16">
      {/* Hero welcome */}
      <section className="relative px-4 pt-12 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-glow" />
        <div className="container mx-auto max-w-4xl relative z-10">
          <motion.div className="text-center" initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <motion.img
              src={logo}
              alt="OneSwap"
              className="h-16 w-16 rounded-2xl object-cover mx-auto mb-4 shadow-glow"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            />
            <motion.h1 className="font-heading text-3xl sm:text-5xl font-bold mb-3" variants={fadeUp} custom={1}>
              Welcome back,{" "}
              <span className="text-gradient">{displayName}</span>! 👋
            </motion.h1>
            <motion.p className="text-muted-foreground text-lg max-w-xl mx-auto" variants={fadeUp} custom={2}>
              Everything a student needs — in one place. Start exploring.
            </motion.p>
            <motion.div className="mt-6 flex flex-wrap items-center justify-center gap-3" variants={fadeUp} custom={3}>
              <Link to="/resources">
                <button className="bg-gradient-primary rounded-full px-6 py-3 text-sm font-semibold text-white shadow-glow transition-transform hover:scale-[1.02]">
                  Explore Marketplace
                </button>
              </Link>
              <Link to="/profile">
                <button className="rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted">
                  My Profile
                </button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Quick action cards */}
      <section className="px-4 pb-16 -mt-4">
        <div className="container mx-auto max-w-4xl">
          <div className="grid sm:grid-cols-2 gap-4">
            {quickActions.map((action, i) => (
              <motion.div key={action.to} initial="hidden" animate="visible" variants={fadeUp} custom={i + 4}>
                <Link to={action.to}>
                  <div className="bg-card rounded-2xl p-6 shadow-soft hover:shadow-glow transition-all border border-border/50 group cursor-pointer h-full">
                    <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <action.icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="font-heading font-semibold text-lg mb-1">{action.title}</h3>
                    <p className="text-sm text-muted-foreground">{action.desc}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-16">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            className="bg-gradient-primary rounded-2xl p-6 sm:p-8 text-center shadow-glow"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Sparkles className="h-8 w-8 text-white mx-auto mb-3" />
            <h2 className="font-heading text-2xl font-bold text-white mb-2">
              Share Smarter, Save Together 🌱
            </h2>
            <p className="text-white/80 text-sm mb-4 max-w-md mx-auto">
              Every exchange makes a sustainable difference on your campus!
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link to="/resources">
                <button className="bg-white text-foreground font-semibold px-6 py-2 rounded-full text-sm hover:bg-white/90 transition-colors flex items-center gap-2">
                  <BookOpen className="h-4 w-4" /> Explore Now
                </button>
              </Link>
              <Link to="/profile">
                <button className="bg-white/20 text-white font-semibold px-6 py-2 rounded-full text-sm hover:bg-white/30 transition-colors flex items-center gap-2">
                  <User className="h-4 w-4" /> My Profile
                </button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Home;
