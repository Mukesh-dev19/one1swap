import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Mail, MapPin, Instagram, Linkedin, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

const socials = [
  { icon: Instagram, label: "Instagram", href: "https://instagram.com/oneswap.in", color: "hover:text-pink-500" },
  { icon: Linkedin, label: "LinkedIn", href: "https://linkedin.com/company/oneswap", color: "hover:text-blue-600" },
  { icon: Twitter, label: "Twitter / X", href: "https://twitter.com/oneswap_in", color: "hover:text-sky-500" },
  { icon: Mail, label: "oneswap.help@gmail.com", href: "mailto:oneswap.help@gmail.com", color: "hover:text-primary" },
];

const Contact = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }
    setSending(true);
    // Simulate send
    await new Promise((r) => setTimeout(r, 1000));
    toast({ title: "Message sent! ✉️", description: "We'll get back to you soon." });
    setName("");
    setEmail("");
    setMessage("");
    setSending(false);
  };

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <motion.div className="text-center mb-12" initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <h1 className="font-heading text-3xl sm:text-5xl font-bold mb-4">
            Get in <span className="text-gradient">Touch</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Have a question, suggestion, or just want to say hi? We'd love to hear from you.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Contact Form */}
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}>
            <div className="bg-card rounded-2xl p-6 sm:p-8 border border-border/50 shadow-soft">
              <h2 className="font-heading text-xl font-bold mb-6">Send a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="contact-name">Name</Label>
                  <Input id="contact-name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="contact-email">Email</Label>
                  <Input id="contact-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="contact-msg">Message</Label>
                  <Textarea id="contact-msg" placeholder="Tell us what's on your mind..." rows={5} value={message} onChange={(e) => setMessage(e.target.value)} className="mt-1 resize-none" />
                </div>
                <Button type="submit" className="w-full bg-gradient-primary text-white font-semibold gap-2" disabled={sending}>
                  {sending ? "Sending..." : <><Send className="h-4 w-4" /> Send Message</>}
                </Button>
              </form>
            </div>
          </motion.div>

          {/* Social + Info */}
          <motion.div className="space-y-6" initial="hidden" animate="visible" variants={fadeUp} custom={2}>
            <div className="bg-card rounded-2xl p-6 sm:p-8 border border-border/50 shadow-soft">
              <h2 className="font-heading text-xl font-bold mb-6">Connect With Us</h2>
              <div className="space-y-4">
                {socials.map((s) => (
                  <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                    className={`flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors ${s.color}`}>
                    <s.icon className="h-5 w-5" />
                    <span className="text-sm font-medium">{s.label}</span>
                  </a>
                ))}
              </div>
            </div>

            <div className="bg-card rounded-2xl p-6 sm:p-8 border border-border/50 shadow-soft">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-5 w-5 text-primary" />
                <h3 className="font-heading font-semibold">Location</h3>
              </div>
              <p className="text-sm text-muted-foreground">Based in India 🇮🇳</p>
              <p className="text-sm text-muted-foreground mt-1">Building for campuses across the country.</p>
            </div>

            <div className="bg-gradient-primary rounded-2xl p-6 text-center shadow-glow">
              <p className="text-white font-semibold mb-1">Want to partner with us?</p>
              <p className="text-white/80 text-sm">Reach out to discuss collaborations and campus partnerships.</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
