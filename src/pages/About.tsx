import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Target, Lightbulb, TrendingUp, BookOpen, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.jpeg";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

const team = [
  { name: "Mukesh B.", role: "Founder & Developer", emoji: "🚀" },
];

const About = () => {
  const [stats, setStats] = useState({ users: 0, resources: 0, campuses: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const { count: users } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      const { count: resources } = await supabase.from("resources").select("*", { count: "exact", head: true });
      const { data: campusData } = await supabase.from("profiles").select("campus").not("campus", "is", null);
      const uniqueCampuses = new Set(campusData?.map((p) => p.campus).filter(Boolean)).size;
      setStats({ users: users || 0, resources: resources || 0, campuses: uniqueCampuses });
    };
    fetchStats();
  }, []);

  const liveStats = [
    { label: "Students Joined", value: stats.users, icon: Users },
    { label: "Resources Shared", value: stats.resources, icon: BookOpen },
    { label: "Campuses Active", value: stats.campuses, icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Hero */}
        <motion.div className="text-center mb-16" initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <img src={logo} alt="OneSwap" className="h-16 w-16 rounded-2xl object-cover mx-auto mb-4 shadow-glow" />
          <h1 className="font-heading text-3xl sm:text-5xl font-bold mb-4">
            About <span className="text-gradient">OneSwap</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            By students, For students, From India — building the largest student resource-sharing platform across Indian campuses.
          </p>
        </motion.div>

        {/* Mission */}
        <motion.section className="mb-16" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}>
          <div className="bg-card rounded-2xl p-8 border border-border/50 shadow-soft">
            <div className="flex items-center gap-3 mb-4">
              <Target className="h-6 w-6 text-primary" />
              <h2 className="font-heading text-2xl font-bold">Our Mission</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              OneSwap was born from a simple idea: college students shouldn't have to spend a fortune on resources that others have already used.
              We're building a trusted community where students can buy, sell, exchange, and share academic materials — from textbooks to lab equipment —
              making education more affordable and sustainable for everyone.
            </p>
          </div>
        </motion.section>

        {/* Vision */}
        <motion.section className="mb-16" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={2}>
          <div className="bg-card rounded-2xl p-8 border border-border/50 shadow-soft">
            <div className="flex items-center gap-3 mb-4">
              <Lightbulb className="h-6 w-6 text-primary" />
              <h2 className="font-heading text-2xl font-bold">Our Vision</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              To become India's go-to platform for student resource sharing — connecting every campus, reducing waste, and empowering students
              to help each other succeed academically and financially.
            </p>
          </div>
        </motion.section>

        {/* Live Stats */}
        <motion.section className="mb-16" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={3}>
          <h2 className="font-heading text-2xl font-bold text-center mb-8">Platform Stats</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {liveStats.map((s, i) => (
              <motion.div key={s.label} className="bg-card rounded-2xl p-6 text-center border border-border/50 shadow-soft" variants={fadeUp} custom={i + 3}>
                <s.icon className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="font-heading text-2xl font-bold text-gradient">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Team */}
        <motion.section className="mb-16" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={4}>
          <h2 className="font-heading text-2xl font-bold text-center mb-8">Meet the Team</h2>
          <div className="flex justify-center">
            {team.map((t) => (
              <div key={t.name} className="bg-card rounded-2xl p-6 text-center border border-border/50 shadow-soft w-56">
                <span className="text-4xl block mb-3">{t.emoji}</span>
                <h3 className="font-heading font-semibold">{t.name}</h3>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Story */}
        <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={5}>
          <div className="bg-gradient-primary rounded-2xl p-8 text-center shadow-glow">
            <Heart className="h-8 w-8 text-white mx-auto mb-4" />
            <h2 className="font-heading text-2xl font-bold text-white mb-3">Our Story</h2>
            <p className="text-white/80 max-w-2xl mx-auto leading-relaxed">
              It all started when we noticed how many perfectly good textbooks, gadgets, and study materials were being thrown away or left unused every semester.
              We thought — what if there was a simple way for students to pass them on? That's how OneSwap was born.
              Today, we're growing campus by campus, helping students save money and build a greener future.
            </p>
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default About;
