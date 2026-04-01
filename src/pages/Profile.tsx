import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Mail, MapPin, Edit, Package, Save, Camera, Users, UserPlus, UserCheck, UserX, UserMinus, MessageSquare, Search, GraduationCap, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface ProfileData {
  full_name: string | null;
  college: string | null;
  campus: string | null;
  bio: string | null;
  avatar_url: string | null;
  department: string | null;
  year_of_study: string | null;
}

interface Resource {
  id: string;
  title: string;
  price: number;
  type: string;
  images: string[];
}

interface FollowProfile {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  college: string | null;
}

interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  profile?: FollowProfile;
}

interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  profile?: FollowProfile;
}

type ProfileTab = "listings" | "following" | "followers" | "requests";

const DEPARTMENTS = [
  "Computer Science", "Information Technology", "Electronics", "Mechanical",
  "Civil", "Electrical", "Chemical", "Biomedical", "Aerospace",
  "Mathematics", "Physics", "Chemistry", "Biology", "Commerce",
  "Business Administration", "Arts", "Law", "Medicine", "Other"
];

const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "PG 1st Year", "PG 2nd Year", "PhD"];

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData>({ full_name: "", college: "", campus: "", bio: "", avatar_url: null, department: null, year_of_study: null });
  const [listings, setListings] = useState<Resource[]>([]);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>("listings");

  // Follow system
  const [following, setFollowing] = useState<Friendship[]>([]);
  const [followers, setFollowers] = useState<Friendship[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FollowProfile[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchListings();
      fetchFollowing();
      fetchRequests();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).single();
    if (data) setProfile(data as ProfileData);
  };

  const fetchListings = async () => {
    const { data } = await supabase.from("resources").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
    if (data) setListings(data as Resource[]);
  };

  const fetchFollowing = async () => {
    if (!user) return;
    const { data } = await supabase.from("friendships").select("*").eq("user_id", user.id);
    if (data) {
      const enriched: Friendship[] = [];
      for (const f of data) {
        const { data: p } = await supabase.from("profiles").select("user_id, full_name, avatar_url, college").eq("user_id", f.friend_id).single();
        enriched.push({ ...f, profile: p || undefined } as Friendship);
      }
      setFollowing(enriched);
    }
    const { data: followerData } = await supabase.from("friendships").select("*").eq("friend_id", user.id);
    if (followerData) {
      const enrichedFollowers: Friendship[] = [];
      for (const f of followerData) {
        const { data: p } = await supabase.from("profiles").select("user_id, full_name, avatar_url, college").eq("user_id", f.user_id).single();
        enrichedFollowers.push({ ...f, profile: p || undefined } as Friendship);
      }
      setFollowers(enrichedFollowers);
    }
  };

  const fetchRequests = async () => {
    if (!user) return;
    const { data: incoming } = await supabase.from("friend_requests").select("*").eq("receiver_id", user.id).eq("status", "pending");
    if (incoming) {
      const enriched = await Promise.all(
        incoming.map(async (r: any) => {
          const { data: p } = await supabase.from("profiles").select("user_id, full_name, avatar_url, college").eq("user_id", r.sender_id).single();
          return { ...r, profile: p || undefined } as FriendRequest;
        })
      );
      setIncomingRequests(enriched);
    }
    const { data: sent } = await supabase.from("friend_requests").select("*").eq("sender_id", user.id).eq("status", "pending");
    if (sent) setSentRequests(sent as FriendRequest[]);
  };

  const sendFollowRequest = async (receiverId: string) => {
    if (!user || receiverId === user.id) return;
    const { error } = await supabase.from("friend_requests").insert({ sender_id: user.id, receiver_id: receiverId });
    if (error) {
      if (error.code === "23505") toast({ title: "Already sent" });
      else toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Follow request sent! 🎉" });
      fetchRequests();
    }
  };

  const acceptRequest = async (requestId: string, senderId: string) => {
    if (!user) return;
    await supabase.from("friend_requests").update({ status: "accepted" }).eq("id", requestId);
    await supabase.from("friendships").insert({ user_id: senderId, friend_id: user.id });
    toast({ title: "Request accepted!" });
    fetchFollowing();
    fetchRequests();
  };

  const rejectRequest = async (requestId: string) => {
    await supabase.from("friend_requests").update({ status: "rejected" }).eq("id", requestId);
    toast({ title: "Request declined" });
    fetchRequests();
  };

  const unfollowUser = async (targetUserId: string) => {
    if (!user) return;
    await supabase.from("friendships").delete().eq("user_id", user.id).eq("friend_id", targetUserId);
    toast({ title: "Unfollowed" });
    fetchFollowing();
  };

  const isFollowing = (userId: string) => following.some(f => f.friend_id === userId);
  const hasSentRequest = (userId: string) => sentRequests.some(r => r.receiver_id === userId);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !user) return;
    setSearching(true);
    const { data } = await supabase.from("profiles").select("user_id, full_name, avatar_url, college").neq("user_id", user.id).ilike("full_name", `%${searchQuery}%`).limit(20);
    setSearchResults((data as FollowProfile[]) || []);
    setSearching(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const filePath = `${user.id}/avatar-${Date.now()}.${file.name.split(".").pop()}`;
    const { error: uploadError } = await supabase.storage.from("resource-images").upload(filePath, file);
    if (!uploadError) {
      const { data: urlData } = supabase.storage.from("resource-images").getPublicUrl(filePath);
      await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("user_id", user.id);
      setProfile((prev) => ({ ...prev, avatar_url: urlData.publicUrl }));
      toast({ title: "Photo updated! 📸" });
    }
    setUploading(false);
  };

  const handleSave = async () => {
    const { error } = await supabase.from("profiles").update({
      full_name: profile.full_name,
      college: profile.college,
      campus: profile.campus,
      bio: profile.bio,
      department: profile.department,
      year_of_study: profile.year_of_study,
    }).eq("user_id", user!.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated! ✨" });
      setEditing(false);
    }
  };

  const Avatar = ({ url, name, size = "h-10 w-10" }: { url: string | null; name: string | null; size?: string }) => (
    url ? (
      <img src={url} alt="" className={`${size} rounded-full object-cover`} />
    ) : (
      <div className={`${size} rounded-full bg-gradient-primary flex items-center justify-center shrink-0`}>
        <span className="text-white font-bold text-sm">{(name || "?")[0].toUpperCase()}</span>
      </div>
    )
  );

  const tabs: { key: ProfileTab; label: string; icon: any; count?: number }[] = [
    { key: "listings", label: "Listings", icon: Package, count: listings.length },
    { key: "following", label: "Following", icon: Users, count: following.length },
    { key: "followers", label: "Followers", icon: Users, count: followers.length },
    { key: "requests", label: "Requests", icon: UserCheck, count: incomingRequests.length },
  ];

  return (
    <div className="min-h-screen pt-16 px-4 pb-8">
      <div className="container mx-auto max-w-3xl pt-4">
        {/* Profile card */}
        <motion.div
          className="bg-card rounded-2xl p-6 sm:p-8 mb-6 shadow-soft border border-border/50"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative group">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="h-24 w-24 rounded-full object-cover border-4 border-primary/20" />
              ) : (
                <div className="h-24 w-24 rounded-full bg-gradient-primary flex items-center justify-center">
                  <User className="h-12 w-12 text-white" />
                </div>
              )}
              <label className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                <Camera className="h-6 w-6 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
              </label>
            </div>
            <div className="flex-1 text-center sm:text-left space-y-2">
              {editing ? (
                <div className="space-y-2">
                  <Input placeholder="Full Name" value={profile.full_name || ""} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} className="rounded-xl" />
                  <Input placeholder="College" value={profile.college || ""} onChange={(e) => setProfile({ ...profile, college: e.target.value })} className="rounded-xl" />
                  <Input placeholder="Campus" value={profile.campus || ""} onChange={(e) => setProfile({ ...profile, campus: e.target.value })} className="rounded-xl" />
                  <Select value={profile.department || ""} onValueChange={(v) => setProfile({ ...profile, department: v })}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select Department" /></SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={profile.year_of_study || ""} onValueChange={(v) => setProfile({ ...profile, year_of_study: v })}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Year of Study" /></SelectTrigger>
                    <SelectContent>
                      {YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
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
                  {profile.department && (
                    <p className="text-muted-foreground flex items-center justify-center sm:justify-start gap-1 text-sm">
                      <Building2 className="h-3 w-3" /> {profile.department}
                    </p>
                  )}
                  {profile.year_of_study && (
                    <p className="text-muted-foreground flex items-center justify-center sm:justify-start gap-1 text-sm">
                      <GraduationCap className="h-3 w-3" /> {profile.year_of_study}
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

          {/* Stats row */}
          <div className="flex justify-center sm:justify-start gap-6 mt-4 pt-4 border-t border-border/50">
            <div className="text-center">
              <p className="font-heading font-bold text-lg">{listings.length}</p>
              <p className="text-xs text-muted-foreground">Listings</p>
            </div>
            <div className="text-center">
              <p className="font-heading font-bold text-lg">{following.length}</p>
              <p className="text-xs text-muted-foreground">Following</p>
            </div>
            <div className="text-center">
              <p className="font-heading font-bold text-lg">{followers.length}</p>
              <p className="text-xs text-muted-foreground">Followers</p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? "default" : "outline"}
              size="sm"
              className={`gap-1.5 rounded-full shrink-0 ${activeTab === tab.key ? "bg-gradient-primary text-white" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <tab.icon className="h-3.5 w-3.5" /> {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="text-xs opacity-70">({tab.count})</span>
              )}
            </Button>
          ))}
        </div>

        {/* Find People */}
        {(activeTab === "following" || activeTab === "followers" || activeTab === "requests") && (
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Search users by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="rounded-full"
            />
            <Button onClick={handleSearch} className="bg-gradient-primary text-white rounded-full" disabled={searching}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="bg-card rounded-2xl p-3 mb-4 border border-border/50 space-y-1">
            <p className="text-xs font-medium text-muted-foreground px-2 mb-1">Search Results</p>
            {searchResults.map((p) => (
              <div key={p.user_id} className="flex items-center gap-2 p-2 rounded-xl hover:bg-muted/50">
                <Avatar url={p.avatar_url} name={p.full_name} size="h-9 w-9" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{p.full_name || "Anonymous"}</p>
                  {p.college && <p className="text-xs text-muted-foreground truncate">{p.college}</p>}
                </div>
                {isFollowing(p.user_id) ? (
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => unfollowUser(p.user_id)}>Unfollow</Button>
                ) : hasSentRequest(p.user_id) ? (
                  <Badge variant="outline" className="text-xs">Pending</Badge>
                ) : (
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => sendFollowRequest(p.user_id)}>
                    <UserPlus className="h-3 w-3" /> Follow
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Listings Tab */}
        {activeTab === "listings" && (
          <>
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
          </>
        )}

        {/* Following Tab */}
        {activeTab === "following" && (
          <div className="space-y-1">
            {following.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>Not following anyone yet</p>
              </div>
            ) : (
              following.map((f) => (
                <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 hover:shadow-soft transition-all">
                  <Avatar url={f.profile?.avatar_url || null} name={f.profile?.full_name || null} size="h-10 w-10" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{f.profile?.full_name || "Anonymous"}</p>
                    {f.profile?.college && <p className="text-xs text-muted-foreground truncate">{f.profile.college}</p>}
                  </div>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => navigate("/messages")}>
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 px-3 text-xs" onClick={() => unfollowUser(f.friend_id)}>
                    <UserMinus className="h-3 w-3 mr-1" /> Unfollow
                  </Button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Followers Tab */}
        {activeTab === "followers" && (
          <div className="space-y-1">
            {followers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>No followers yet</p>
              </div>
            ) : (
              followers.map((f) => (
                <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 hover:shadow-soft transition-all">
                  <Avatar url={f.profile?.avatar_url || null} name={f.profile?.full_name || null} size="h-10 w-10" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{f.profile?.full_name || "Anonymous"}</p>
                    {f.profile?.college && <p className="text-xs text-muted-foreground truncate">{f.profile.college}</p>}
                  </div>
                  {!isFollowing(f.user_id) && (
                    <Button size="sm" variant="outline" className="h-8 px-3 text-xs gap-1" onClick={() => sendFollowRequest(f.user_id)}>
                      <UserPlus className="h-3 w-3" /> Follow back
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => navigate("/messages")}>
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === "requests" && (
          <div className="space-y-1">
            {incomingRequests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <UserCheck className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>No pending requests</p>
              </div>
            ) : (
              incomingRequests.map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 hover:shadow-soft transition-all">
                  <Avatar url={r.profile?.avatar_url || null} name={r.profile?.full_name || null} size="h-10 w-10" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{r.profile?.full_name || "Anonymous"}</p>
                    <p className="text-xs text-muted-foreground">Wants to follow you</p>
                  </div>
                  <Button size="sm" className="h-8 px-3 text-xs gap-1 bg-gradient-primary text-white" onClick={() => acceptRequest(r.id, r.sender_id)}>
                    <UserCheck className="h-3 w-3" /> Accept
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => rejectRequest(r.id)}>
                    <UserX className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
