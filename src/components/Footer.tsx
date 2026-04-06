import { Link } from "react-router-dom";
import logo from "@/assets/logo.jpeg";

const Footer = () => (
  <footer className="border-t border-border/50 bg-card/60 mt-20">
    <div className="container mx-auto px-4 py-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <img src={logo} alt="OneSwap" className="h-8 w-8 rounded-lg object-cover" />
            <span className="font-heading text-lg font-bold text-gradient">OneSwap</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Sustainable resource sharing for college students. Buy, sell, exchange & share.
          </p>
          <p className="text-xs text-muted-foreground">Owned by Mukesh B.</p>
        </div>
        {[
          { title: "Platform", links: [["Browse", "/marketplace"], ["Upload", "/upload"], ["Dashboard", "/dashboard"]] },
          { title: "Account", links: [["Login", "/login"], ["Register", "/register"], ["Profile", "/profile"]] },
          { title: "Info", links: [["About", "/about"], ["Contact", "/contact"], ["Privacy", "#"]] },
        ].map((col) => (
          <div key={col.title}>
            <h4 className="font-heading font-semibold mb-3">{col.title}</h4>
            <ul className="space-y-2">
              {col.links.map(([label, to]) => (
                <li key={label}>
                  <Link to={to} className="text-sm text-muted-foreground hover:text-primary transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border/50 mt-8 pt-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} OneSwap. All rights reserved.
      </div>
    </div>
  </footer>
);

export default Footer;
