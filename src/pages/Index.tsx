import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Recycle, Users, Zap, Shield, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo.jpeg";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

const categories = [
  { icon: BookOpen, label: "Books", count: "250+" },
  { icon: Zap, label: "Electronics", count: "180+" },
  { icon: Users, label: "Study Groups", count: "90+" },
  { icon: Recycle, label: "Exchange", count: "320+" },
];

const features = [
  { icon: Shield, title: "Secure Trades", desc: "Verified college students only. Safe exchanges on campus." },
  { icon: MessageSquare, title: "Real-time Chat", desc: "Message sellers instantly. Negotiate and arrange meetups." },
  { icon: Recycle, title: "Sustainability", desc: "Reduce waste by sharing resources. Track your impact." },
  { icon: Zap, title: "Quick Upload", desc: "List your items in seconds with our simple upload form." },
];

const steps = [
  { num: "01", title: "Create Account", desc: "Sign up with your college email in seconds." },
  { num: "02", title: "List or Browse", desc: "Upload resources or explore what others are sharing." },
  { num: "03", title: "Connect & Exchange", desc: "Chat with peers and complete your exchange." },
];

const Index = () => {
  const { user, loading } = useAuth();

  if (!loading && user) {
    return <Navigate to="/marketplace" replace />;
  }

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative pt-28 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-glow" />
        <div className="container mx-auto text-center relative z-10">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <img src={logo} alt="OneSwap" className="h-20 w-20 rounded-2xl object-cover mx-auto mb-6 shadow-glow animate-float" />
          </motion.div>
          <motion.h1
            className="font-heading text-4xl sm:text-6xl lg:text-7xl font-bold mb-6"
            initial="hidden" animate="visible" variants={fadeUp} custom={1}
          >
            Share Smarter,{" "}
            <span className="text-gradient">Save Together</span>
          </motion.h1>
          <motion.p
            className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto mb-8"
            initial="hidden" animate="visible" variants={fadeUp} custom={2}
          >
            The sustainable marketplace for college students to buy, sell, exchange, and share academic resources. All prices in ₹.
          </motion.p>
          <motion.div className="flex flex-wrap gap-3 justify-center" initial="hidden" animate="visible" variants={fadeUp} custom={3}>
            <Link to="/register">
              <Button size="lg" className="bg-gradient-primary font-semibold gap-2 text-base px-8 text-white">
                Get Started <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="font-semibold text-base px-8">
                Sign In
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((cat, i) => (
              <motion.div
                key={cat.label}
                className="bg-card rounded-2xl p-6 text-center shadow-soft hover:shadow-glow transition-all cursor-pointer group border border-border/50"
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
              >
                <cat.icon className="h-8 w-8 mx-auto mb-3 text-primary group-hover:scale-110 transition-transform" />
                <h3 className="font-heading font-semibold">{cat.label}</h3>
                <p className="text-sm text-muted-foreground">{cat.count} items</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-gradient-glow">
        <div className="container mx-auto">
          <motion.h2
            className="font-heading text-3xl sm:text-4xl font-bold text-center mb-12"
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
          >
            Why <span className="text-gradient">OneSwap</span>?
          </motion.h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="bg-card rounded-2xl p-6 shadow-soft hover:shadow-glow transition-all border border-border/50"
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
              >
                <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center mb-4">
                  <f.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-heading font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <motion.h2
            className="font-heading text-3xl sm:text-4xl font-bold text-center mb-12"
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
          >
            How It <span className="text-gradient">Works</span>
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((s, i) => (
              <motion.div
                key={s.num}
                className="text-center"
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
              >
                <span className="font-heading text-5xl font-bold text-gradient opacity-60">{s.num}</span>
                <h3 className="font-heading text-xl font-semibold mt-2 mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <motion.div
            className="bg-gradient-primary rounded-2xl p-8 sm:p-12 text-center shadow-glow"
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
          >
            <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4 text-white">
              Ready to swap smarter?
            </h2>
            <p className="text-white/80 mb-6 max-w-lg mx-auto">
              Join thousands of college students already saving money and reducing waste.
            </p>
            <Link to="/register">
              <Button size="lg" variant="outline" className="font-semibold gap-2 px-10 bg-white text-foreground hover:bg-white/90">
                Join OneSwap <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Index;
