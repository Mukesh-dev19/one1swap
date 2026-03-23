import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, MessageSquare, User, Clock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link, useParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

const MOCK = {
  id: "1", title: "Calculus Textbook (8th Ed)", category: "Books", price: 25, type: "Sell",
  condition: "Good", location: "Campus A", image: "📘",
  description: "Stewart's Calculus 8th Edition. Some highlighting but otherwise in great shape. Perfect for MATH 201/202.",
  seller: { name: "Alex M.", college: "Engineering", rating: 4.8 },
};

const MOCK_REQUESTS = [
  { id: 1, user: "Sarah K.", message: "Hi! Is this still available? I need it for next semester.", time: "2 min ago" },
  { id: 2, user: "James L.", message: "Would you take $20 for it?", time: "15 min ago" },
  { id: 3, user: "Priya R.", message: "Can I pick it up tomorrow at the library?", time: "1 hr ago" },
];

const ResourceDetail = () => {
  const { id } = useParams();
  const [requestMsg, setRequestMsg] = useState("");
  const [requests, setRequests] = useState(MOCK_REQUESTS);

  const handleSendRequest = () => {
    if (!requestMsg.trim()) return;
    setRequests([{ id: Date.now(), user: "You", message: requestMsg, time: "Just now" }, ...requests]);
    setRequestMsg("");
    toast({ title: "Request sent!", description: "The owner will see your request. First come, first served!" });
  };

  return (
    <div className="min-h-screen pt-20 px-4">
      <div className="container mx-auto max-w-4xl">
        <Link to="/marketplace">
          <Button variant="ghost" size="sm" className="mb-4 gap-1">
            <ArrowLeft className="h-4 w-4" /> Back to Browse
          </Button>
        </Link>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Image */}
          <motion.div
            className="glass rounded-2xl h-72 md:h-96 flex items-center justify-center text-8xl"
            initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
          >
            {MOCK.image}
          </motion.div>

          {/* Details */}
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary">{MOCK.type}</Badge>
              <Badge variant="outline">{MOCK.category}</Badge>
              <Badge variant="outline">{MOCK.condition}</Badge>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold">{MOCK.title}</h1>
            <p className="text-3xl font-heading font-bold text-primary">
              {MOCK.price === 0 ? "Free" : `$${MOCK.price}`}
            </p>
            <p className="text-muted-foreground">{MOCK.description}</p>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" /> {MOCK.location}
            </div>

            {/* Seller card */}
            <div className="glass rounded-xl p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{MOCK.seller.name}</p>
                <p className="text-xs text-muted-foreground">{MOCK.seller.college} · ⭐ {MOCK.seller.rating}</p>
              </div>
              <Link to="/messages">
                <Button size="sm" variant="outline" className="gap-1">
                  <MessageSquare className="h-3 w-3" /> Chat
                </Button>
              </Link>
            </div>

            <Button size="lg" className="w-full bg-gradient-primary font-semibold gap-2">
              <MessageSquare className="h-4 w-4" /> Request This Resource
            </Button>
          </motion.div>
        </div>

        {/* Real-time requests section */}
        <motion.div
          className="mt-12"
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        >
          <h2 className="font-heading text-xl font-bold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Requests <span className="text-muted-foreground text-sm font-normal">(First come, first served)</span>
          </h2>

          {/* Send request */}
          <div className="flex gap-2 mb-6">
            <Input
              placeholder="Send a request to the owner..."
              value={requestMsg}
              onChange={(e) => setRequestMsg(e.target.value)}
              className="bg-card"
              onKeyDown={(e) => e.key === "Enter" && handleSendRequest()}
            />
            <Button onClick={handleSendRequest} className="bg-gradient-primary gap-1">
              <Send className="h-4 w-4" /> Send
            </Button>
          </div>

          {/* Request list */}
          <div className="space-y-3">
            {requests.map((req, i) => (
              <motion.div
                key={req.id}
                className="glass rounded-xl p-4 flex items-start gap-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{req.user}</span>
                    <Badge variant="outline" className="text-xs">#{i + 1}</Badge>
                    <span className="text-xs text-muted-foreground ml-auto">{req.time}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{req.message}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ResourceDetail;
