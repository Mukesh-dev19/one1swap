import { motion } from "framer-motion";
import { User, Mail, MapPin, Edit, BookOpen, Package, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

const MOCK_LISTINGS = [
  { id: "1", title: "Calculus Textbook", price: 25, type: "Sell", image: "📘" },
  { id: "2", title: "Arduino Kit", price: 40, type: "Sell", image: "🔧" },
  { id: "3", title: "Chemistry Notes", price: 0, type: "Share", image: "📝" },
];

const Profile = () => {
  return (
    <div className="min-h-screen pt-20 px-4">
      <div className="container mx-auto max-w-3xl">
        <motion.div
          className="glass rounded-2xl p-6 sm:p-8 mb-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="h-24 w-24 rounded-full bg-secondary flex items-center justify-center">
              <User className="h-12 w-12 text-muted-foreground" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h1 className="font-heading text-2xl font-bold">Alex Martinez</h1>
              <p className="text-muted-foreground flex items-center justify-center sm:justify-start gap-1 text-sm mt-1">
                <Mail className="h-3 w-3" /> alex@college.edu
              </p>
              <p className="text-muted-foreground flex items-center justify-center sm:justify-start gap-1 text-sm">
                <MapPin className="h-3 w-3" /> Campus A · Engineering
              </p>
              <div className="flex items-center justify-center sm:justify-start gap-1 mt-1">
                <Star className="h-4 w-4 text-primary fill-primary" />
                <span className="text-sm font-medium">4.8</span>
                <span className="text-xs text-muted-foreground">(24 reviews)</span>
              </div>
            </div>
            <Button variant="outline" className="gap-1">
              <Edit className="h-4 w-4" /> Edit Profile
            </Button>
          </div>
        </motion.div>

        <h2 className="font-heading text-xl font-bold mb-4 flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" /> My Listings
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MOCK_LISTINGS.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            >
              <Link to={`/resource/${item.id}`}>
                <div className="glass rounded-xl overflow-hidden hover:shadow-glow transition-all cursor-pointer">
                  <div className="h-32 bg-secondary flex items-center justify-center text-4xl">{item.image}</div>
                  <div className="p-3">
                    <Badge variant="secondary" className="text-xs mb-1">{item.type}</Badge>
                    <h3 className="font-heading font-semibold text-sm">{item.title}</h3>
                    <p className="font-heading font-bold text-primary text-sm mt-1">
                      {item.price === 0 ? "Free" : `$${item.price}`}
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Profile;
