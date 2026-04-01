import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Recycle, Users, Zap, Shield, MessageSquare, FlaskConical, FileText, Smartphone, Package, Handshake, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo.jpeg";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

const categories = [
  { icon: BookOpen, label: "Books & Study Materials", emoji: "📚" },
  { icon: Zap, label: "Electronics & Gadgets", emoji: "💻" },
  { icon: FlaskConical, label: "Lab Equipment & Tools", emoji: "🧪" },
  { icon: FileText, label: "Notes & Academic Resources", emoji: "📄" },
];

const values = [
  { icon: "💸", title: "Save Money", desc: "Save money on expensive academic resources" },
  { icon: "🔄", title: "Exchange Items", desc: "Exchange items instead of buying new" },
  { icon: "🤝", title: "Trusted Students", desc: "Connect with trusted students on your campus" },
  { icon: "🌱", title: "Go Sustainable", desc: "Support a sustainable campus community" },
];

const steps = [
  { emoji: "📲", num: "01", title: "Sign Up", desc: "Sign up with your college email in seconds." },
  { emoji: "📦", num: "02", title: "List or Browse", desc: "Upload resources or explore what others are sharing." },
  { emoji: "💬", num: "03", title: "Connect", desc: "Chat with students and arrange exchange." },
  { emoji: "🤝", num: "04", title: "Meet & Exchange", desc: "Meet on campus and complete your exchange offline." },
];

const Index = () => {
  const { user, loading } = useAuth();

  if (!loading && user) {
    return <Navigate to="/home" replace />;
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
            Everything a Student Needs —{" "}
            <span className="text-gradient">In One Place.</span>
          </motion.h1>
          <motion.p
            className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto mb-8"
            initial="hidden" animate="visible" variants={fadeUp} custom={2}
          >
            Buy, sell, and exchange books, electronics, and study essentials within your campus — smart, simple, and sustainable.
          </motion.p>
          <motion.div className="flex flex-wrap gap-3 justify-center" initial="hidden" animate="visible" variants={fadeUp} custom={3}>
            <Link to="/register">
              <Button size="lg" className="bg-gradient-primary font-semibold gap-2 text-base px-8 text-white">
                Get Started <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="font-semibold text-base px-8">
                Explore Marketplace
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="py-16 px-4 bg-gradient-glow">
        <div className="container mx-auto">
          <motion.h2
            className="font-heading text-3xl sm:text-4xl font-bold text-center mb-12"
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
          >
            Why <span className="text-gradient">OneSwap</span>?
          </motion.h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v, i) => (
              <motion.div
                key={v.title}
                className="bg-card rounded-2xl p-6 shadow-soft hover:shadow-glow transition-all border border-border/50 text-center"
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
              >
                <span className="text-4xl mb-4 block">{v.icon}</span>
                <h3 className="font-heading font-semibold mb-2">{v.title}</h3>
                <p className="text-sm text-muted-foreground">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <motion.h2
            className="font-heading text-3xl sm:text-4xl font-bold text-center mb-12"
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
          >
            What Can You Find on <span className="text-gradient">OneSwap</span>?
          </motion.h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((cat, i) => (
              <motion.div
                key={cat.label}
                className="bg-card rounded-2xl p-6 text-center shadow-soft hover:shadow-glow transition-all cursor-pointer group border border-border/50"
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
              >
                <span className="text-4xl mb-3 block">{cat.emoji}</span>
                <h3 className="font-heading font-semibold text-sm sm:text-base">{cat.label}</h3>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4 bg-gradient-glow">
        <div className="container mx-auto">
          <motion.h2
            className="font-heading text-3xl sm:text-4xl font-bold text-center mb-4"
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
          >
            Simple. Fast. <span className="text-gradient">Student-Friendly.</span>
          </motion.h2>
          <p className="text-center text-muted-foreground mb-12">How it works in 4 simple steps</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {steps.map((s, i) => (
              <motion.div
                key={s.num}
                className="bg-card rounded-2xl p-6 text-center shadow-soft border border-border/50"
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
              >
                <span className="text-3xl mb-2 block">{s.emoji}</span>
                <span className="font-heading text-3xl font-bold text-gradient opacity-60">{s.num}</span>
                <h3 className="font-heading text-lg font-semibold mt-2 mb-2">{s.title}</h3>
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
