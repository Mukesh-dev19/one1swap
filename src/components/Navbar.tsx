import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Search, Plus, User, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.jpeg";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/marketplace", label: "Browse" },
  { to: "/upload", label: "Upload", icon: Plus },
  { to: "/messages", label: "Messages", icon: MessageSquare },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="OneSwap" className="h-9 w-9 rounded-lg object-cover" />
          <span className="font-heading text-xl font-bold text-gradient">OneSwap</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => (
            <Link key={l.to} to={l.to}>
              <Button
                variant={location.pathname === l.to ? "default" : "ghost"}
                size="sm"
                className="gap-1.5"
              >
                {l.icon && <l.icon className="h-4 w-4" />}
                {l.label}
              </Button>
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2">
          <Link to="/login">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <User className="h-4 w-4" /> Login
            </Button>
          </Link>
          <Link to="/register">
            <Button size="sm" className="bg-gradient-primary font-semibold">
              Get Started
            </Button>
          </Link>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden text-foreground" onClick={() => setOpen(!open)}>
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden glass border-t border-border/50 px-4 pb-4 space-y-1">
          {navLinks.map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)}>
              <Button variant="ghost" className="w-full justify-start gap-2">
                {l.icon && <l.icon className="h-4 w-4" />}
                {l.label}
              </Button>
            </Link>
          ))}
          <div className="flex gap-2 pt-2">
            <Link to="/login" className="flex-1" onClick={() => setOpen(false)}>
              <Button variant="outline" className="w-full">Login</Button>
            </Link>
            <Link to="/register" className="flex-1" onClick={() => setOpen(false)}>
              <Button className="w-full bg-gradient-primary">Register</Button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
