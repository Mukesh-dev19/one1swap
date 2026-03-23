import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Mail, MapPin, Edit, Package, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface Profile {
  full_name: string | null;
  college: string | null;
  campus: string | null;
  bio: string | null;
}

interface Resource {
  id: string;
  title: string;
  price: number;
  type: string;
  images: string[];
}

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile>({ full_name: "", college: "", campus: "", bio: "" });
  const [listings, setListings] = useState<Resource[]>([]);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchListings();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).single();
    if (data) setProfile(data);
  };

  const fetchListings = async () => {
    const { data } = await supabase.from("resources").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
    if (data) setListings(data as Resource[]);
  };

  const handleSave = async () => {
    const { error } = await supabase.from("profiles").update({
      full_name: profile.full_name,
      college: profile.college,
      campus: profile.campus,
      bio: profile.bio,
    }).eq("user_id", user!.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated! ✨" });
      setEditing(false);
    }
  };

  return (
    <div className="min-h-screen pt-16 px-4 pb-8">
      <div className="container mx-auto max-w-3xl pt-4">
        <motion.div
          className="bg-card rounded-2xl p-6 sm:p-8 mb-8 shadow-soft border border-border/50"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="h-24 w-24 rounded-full bg-gradient-primary flex items-center justify-center">
              <User className="h-12 w-12 text-white" />
            </div>
            <div className="flex-1 text-center sm:text-left space-y-2">
              {editing ? (
                <div className="space-y-2">
                  <Input placeholder="Full Name" value={profile.full_name || ""} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} className="rounded-xl" />
                  <Input placeholder="College" value={profile.college || ""} onChange={(e) => setProfile({ ...profile, college: e.target.value })} className="rounded-xl" />
                  <Input placeholder="Campus" value={profile.campus || ""} onChange={(e) => setProfile({ ...profile, campus: e.target.value })} className="rounded-xl" />
                  <Input placeholder="Bio" value={profile.bio || ""} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} className="rounded-xl" />
                </div>
              ) : (
                <>
                  <h1 className="font-heading text-2xl font-bold">{profile.full_name || "Set your name"}</h1>
                  <p className="text-muted-foreground flex items-center justify-center sm:justify-start gap-1 text-sm">
                    <Mail className="h-3 w-3" /> {user?.email}
                  </p>
                  {(profile.campus || profile.college) && (
                    <p className="text-muted-foreground flex items-center justify-center sm:justify-start gap-1 text-sm">
                      <MapPin className="h-3 w-3" /> {profile.campus} · {profile.college}
                    </p>
                  )}
                  {profile.bio && <p className="text-sm text-muted-foreground">{profile.bio}</p>}
                </>
              )}
            </div>
            {editing ? (
              <Button className="gap-1 bg-gradient-primary text-white rounded-xl" onClick={handleSave}>
                <Save className="h-4 w-4" /> Save
              </Button>
            ) : (
              <Button variant="outline" className="gap-1 rounded-xl" onClick={() => setEditing(true)}>
                <Edit className="h-4 w-4" /> Edit
              </Button>
            )}
          </div>
        </motion.div>

        <h2 className="font-heading text-xl font-bold mb-4 flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" /> My Listings
        </h2>
        {listings.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>You haven't listed anything yet.</p>
            <Link to="/upload"><Button className="mt-3 bg-gradient-primary text-white rounded-xl">Upload Resource</Button></Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((item, i) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <Link to={`/resource/${item.id}`}>
                  <div className="bg-card rounded-2xl overflow-hidden shadow-soft hover:shadow-glow transition-all cursor-pointer border border-border/50">
                    <div className="h-32 bg-muted flex items-center justify-center overflow-hidden">
                      {item.images && item.images.length > 0 ? (
                        <img src={item.images[0]} alt={item.title} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-4xl">📦</span>
                      )}
                    </div>
                    <div className="p-3">
                      <Badge className="text-xs mb-1 bg-gradient-primary text-white border-0">{item.type}</Badge>
                      <h3 className="font-heading font-semibold text-sm">{item.title}</h3>
                      <p className="font-heading font-bold text-primary text-sm mt-1">
                        {item.price === 0 ? "Free" : `₹${item.price}`}
                      </p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
