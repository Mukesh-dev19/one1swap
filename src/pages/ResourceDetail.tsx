import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, MessageSquare, User, Clock, Send, Heart, Trash2, Check, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link, useParams, useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Resource {
  id: string;
  title: string;
  category: string;
  price: number;
  type: string;
  condition: string | null;
  location: string | null;
  images: string[];
  files: string[] | null;
  description: string | null;
  user_id: string;
  created_at: string;
  status: string | null;
}

interface ResourceRequest {
  id: string;
  message: string | null;
  created_at: string;
  user_id: string;
  status: string | null;
  profiles?: { full_name: string | null } | null;
}

const ResourceDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [resource, setResource] = useState<Resource | null>(null);
  const [requests, setRequests] = useState<ResourceRequest[]>([]);
  const [requestMsg, setRequestMsg] = useState("");
  const [sellerName, setSellerName] = useState("");
  const [loading, setLoading] = useState(true);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);

  useEffect(() => {
    if (id) {
      fetchResource();
      fetchRequests();
      const cleanup = subscribeToRequests();
      return cleanup;
    }
  }, [id, user?.id]);

  const fetchResource = async () => {
    const { data } = await supabase.from("resources").select("*").eq("id", id).single();
    if (data) {
      setResource(data as unknown as Resource);
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", data.user_id).single();
      if (profile) setSellerName(profile.full_name || "Anonymous");
    }
    setLoading(false);
  };

  const fetchRequests = async () => {
    const { data } = await supabase
      .from("resource_requests")
      .select("*")
      .eq("resource_id", id)
      .order("created_at", { ascending: true });
    if (data) {
      const enriched = await Promise.all(
        data.map(async (req) => {
          const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", req.user_id).single();
          return { ...req, profiles: profile } as ResourceRequest;
        })
      );
      setRequests(enriched);
      setHasRequested(Boolean(user && data.some((req) => req.user_id === user.id)));
    }
  };

  const subscribeToRequests = () => {
    const channel = supabase
      .channel("resource-requests-" + id)
      .on("postgres_changes", { event: "*", schema: "public", table: "resource_requests", filter: `resource_id=eq.${id}` }, async (payload) => {
        if (payload.eventType === "INSERT") {
          const newReq = payload.new as any;
          const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", newReq.user_id).single();
          setRequests((prev) => prev.some((req) => req.id === newReq.id) ? prev : [...prev, { ...newReq, profiles: profile }]);
          if (newReq.user_id === user?.id) setHasRequested(true);
        } else if (payload.eventType === "UPDATE") {
          const updated = payload.new as any;
          setRequests((prev) => prev.map((r) => r.id === updated.id ? { ...r, status: updated.status } : r));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  };

  const handleSendRequest = async () => {
    if (!requestMsg.trim() || !user || !id || requestSubmitting || hasRequested) return;
    setRequestSubmitting(true);
    const { error } = await supabase.from("resource_requests").insert({
      resource_id: id,
      user_id: user.id,
      message: requestMsg,
    });
    setRequestSubmitting(false);
    if (error) {
      if (error.code === "23505") {
        setHasRequested(true);
        toast({ title: "Request already sent", description: "You can only send one request for this resource." });
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setRequestMsg("");
      setHasRequested(true);
      toast({ title: "Request sent! 🎉", description: "First come, first served!" });
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    const { error } = await supabase.from("resource_requests").update({ status: "accepted" }).eq("id", requestId);
    if (!error) {
      // Mark resource as sold - it will be auto-removed
      await supabase.from("resources").update({ status: "sold" }).eq("id", id);
      toast({ title: "Request accepted! ✅", description: "The resource will be removed from marketplace in a few days." });
    }
  };

  const handleDeleteResource = async () => {
    if (!resource || !user || resource.user_id !== user.id) return;
    const { error } = await supabase.from("resources").delete().eq("id", resource.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Resource deleted", description: "Your listing has been removed." });
      navigate("/marketplace");
    }
  };

  const handleMessageSeller = async () => {
    if (!user || !resource) return;
    // Send initial message to seller
    await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: resource.user_id,
      content: `Hi! I'm interested in your listing: "${resource.title}"`,
    });
    navigate("/messages");
  };

  const isOwner = user?.id === resource?.user_id;

  if (loading) return <div className="min-h-screen pt-20 flex items-center justify-center"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;
  if (!resource) return <div className="min-h-screen pt-20 text-center text-muted-foreground">Resource not found.</div>;

  return (
    <div className="min-h-screen pt-16 px-4 pb-8">
      <div className="container mx-auto max-w-4xl pt-4">
        <div className="flex items-center justify-between mb-4">
          <Link to="/marketplace">
            <Button variant="ghost" size="sm" className="gap-1 rounded-full">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </Link>
          {isOwner && (
            <Button variant="destructive" size="sm" className="gap-1 rounded-full" onClick={handleDeleteResource}>
              <Trash2 className="h-4 w-4" /> Delete Listing
            </Button>
          )}
        </div>

        {resource.status === "sold" && (
          <div className="bg-primary/10 border border-primary/30 rounded-2xl p-4 mb-6 text-center">
            <p className="text-primary font-semibold">✅ This resource has been sold/exchanged and will be removed soon.</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          <motion.div
            className="bg-card rounded-2xl h-72 md:h-96 flex items-center justify-center overflow-hidden border border-border/50 shadow-soft"
            initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
          >
            {resource.images && resource.images.length > 0 ? (
              <img src={resource.images[0]} alt={resource.title} className="h-full w-full object-cover" />
            ) : (
              <span className="text-8xl">📦</span>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-gradient-primary text-white border-0">{resource.type}</Badge>
              <Badge variant="outline">{resource.category}</Badge>
              {resource.condition && <Badge variant="outline">{resource.condition}</Badge>}
              {resource.status === "sold" && <Badge variant="destructive">Sold</Badge>}
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold">{resource.title}</h1>
            <p className="text-3xl font-heading font-bold text-primary">
              {resource.price === 0 ? "Free" : `₹${resource.price}`}
            </p>
            {resource.description && <p className="text-muted-foreground">{resource.description}</p>}

            {resource.location && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" /> {resource.location}
              </div>
            )}

            {/* Attached files */}
            {resource.files && resource.files.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">📎 Attached Files</p>
                {resource.files.map((filePath, i) => {
                  const fileName = filePath.split("/").pop() || `File ${i + 1}`;
                  const isFullUrl = filePath.startsWith("http");
                  const triggerDownload = (url: string, name: string) => {
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = name;
                    a.target = "_blank";
                    a.rel = "noopener noreferrer";
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  };
                  return (
                    <button key={i}
                      onClick={async () => {
                        try {
                          if (isFullUrl) {
                            triggerDownload(filePath, fileName);
                          } else {
                            const { data, error } = await supabase
                              .storage
                              .from("resource-files")
                              .createSignedUrl(filePath, 300, { download: fileName });
                            if (error || !data?.signedUrl) {
                              toast({ title: "Error", description: "Could not generate download link", variant: "destructive" });
                              return;
                            }
                            triggerDownload(data.signedUrl, fileName);
                          }
                        } catch (err: any) {
                          toast({ title: "Download failed", description: err?.message || "Please try again", variant: "destructive" });
                        }
                      }}
                      className="flex items-center gap-2 bg-muted/50 rounded-xl px-4 py-2 hover:bg-muted transition-colors w-full text-left">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="text-sm truncate flex-1">{fileName}</span>
                      <Download className="h-4 w-4 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            )}

            <div className="bg-muted/50 rounded-2xl p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{sellerName}</p>
                <p className="text-xs text-muted-foreground">Seller</p>
              </div>
              {!isOwner && (
                <Button size="sm" variant="outline" className="gap-1 rounded-full" onClick={handleMessageSeller}>
                  <MessageSquare className="h-3 w-3" /> Chat
                </Button>
              )}
            </div>

            {!isOwner && resource.status !== "sold" && (
              <div className="flex gap-2">
                <Button size="lg" className="flex-1 bg-gradient-primary font-semibold gap-2 text-white rounded-xl" onClick={() => document.getElementById("request-input")?.focus()}>
                  <MessageSquare className="h-4 w-4" /> Request
                </Button>
                <Button size="lg" variant="outline" className="rounded-xl">
                  <Heart className="h-4 w-4" />
                </Button>
              </div>
            )}
          </motion.div>
        </div>

        {/* Requests Queue */}
        <motion.div className="mt-12" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h2 className="font-heading text-xl font-bold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Requests <span className="text-muted-foreground text-sm font-normal">(First come, first served)</span>
          </h2>

          {!isOwner && resource.status !== "sold" && (
            <div className="flex gap-2 mb-6">
              <Input
                id="request-input"
                placeholder="Send a request to the owner..."
                value={requestMsg}
                onChange={(e) => setRequestMsg(e.target.value)}
                className="rounded-full"
                onKeyDown={(e) => e.key === "Enter" && handleSendRequest()}
                disabled={hasRequested || requestSubmitting}
              />
              <Button onClick={handleSendRequest} className="bg-gradient-primary gap-1 text-white rounded-full" disabled={hasRequested || requestSubmitting}>
                <Send className="h-4 w-4" /> {hasRequested ? "Sent" : requestSubmitting ? "Sending..." : "Send"}
              </Button>
            </div>
          )}

          <div className="space-y-3">
            {requests.map((req, i) => (
              <motion.div
                key={req.id}
                className={`bg-card rounded-2xl p-4 flex items-start gap-3 shadow-soft border ${req.status === "accepted" ? "border-primary/50 bg-primary/5" : "border-border/50"}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{req.profiles?.full_name || "Anonymous"}</span>
                    <Badge variant="outline" className="text-xs">#{i + 1}</Badge>
                    {req.status === "accepted" && <Badge className="bg-primary text-primary-foreground text-xs">Accepted ✅</Badge>}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(req.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{req.message}</p>
                </div>
                {isOwner && req.status !== "accepted" && resource.status !== "sold" && (
                  <Button size="sm" variant="outline" className="gap-1 rounded-full shrink-0" onClick={() => handleAcceptRequest(req.id)}>
                    <Check className="h-3 w-3" /> Accept
                  </Button>
                )}
              </motion.div>
            ))}
            {requests.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">No requests yet. Be the first!</p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ResourceDetail;
