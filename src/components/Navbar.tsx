import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, User, MessageSquare, Home, LayoutDashboard, LogOut, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.jpeg";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) { setUnreadCount(0); return; }
    const fetchUnread = async () => {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .eq("read", false);
      setUnreadCount(count || 0);
    };
    fetchUnread();
    const channel = supabase
      .channel("unread-nav")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, fetchUnread)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const isLanding = location.pathname === "/";

  const navLinks = user
    ? [
        { to: "/home", label: "Home", icon: Home },
        { to: "/resources", label: "Resources", icon: BookOpen },
        { to: "/messages", label: "Messages", icon: MessageSquare },
        { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      ]
    : [];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto flex items-center justify-between h-14 px-4">
        <Link to={user ? "/home" : "/"} className="flex items-center gap-2">
          <img src={logo} alt="OneSwap" className="h-8 w-8 rounded-lg object-cover" />
          <span className="font-heading text-lg font-bold text-gradient">OneSwap</span>
        </Link>
        {isLanding && !user && (
          <span className="hidden lg:block text-xs text-muted-foreground font-light italic tracking-wide">By students, For students, From India</span>
        )}

        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => (
            <Link key={l.to} to={l.to}>
              <Button
                variant={location.pathname === l.to ? "default" : "ghost"}
                size="sm"
                className={`gap-1.5 relative ${location.pathname === l.to ? "bg-gradient-primary text-white" : ""}`}
              >
                <l.icon className="h-4 w-4" />
                {l.label}
                {l.to === "/messages" && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Button>
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              <Link to="/profile">
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <User className="h-4 w-4" /> Profile
                </Button>
              </Link>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" /> Logout
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">Login</Button>
              </Link>
              <Link to="/register">
                <Button size="sm" className="bg-gradient-primary text-white font-semibold">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>

        <button className="md:hidden text-foreground" onClick={() => setOpen(!open)}>
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-card border-t border-border/50 px-4 pb-4 space-y-1">
          {navLinks.map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)}>
              <Button variant="ghost" className="w-full justify-start gap-2 relative">
                <l.icon className="h-4 w-4" /> {l.label}
                {l.to === "/messages" && unreadCount > 0 && (
                  <span className="ml-auto h-5 min-w-[20px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Button>
            </Link>
          ))}
          <div className="flex gap-2 pt-2">
            {user ? (
              <>
                <Link to="/profile" className="flex-1" onClick={() => setOpen(false)}>
                  <Button variant="outline" className="w-full">Profile</Button>
                </Link>
                <Button variant="outline" className="flex-1" onClick={() => { handleSignOut(); setOpen(false); }}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link to="/login" className="flex-1" onClick={() => setOpen(false)}>
                  <Button variant="outline" className="w-full">Login</Button>
                </Link>
                <Link to="/register" className="flex-1" onClick={() => setOpen(false)}>
                  <Button className="w-full bg-gradient-primary text-white">Register</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
