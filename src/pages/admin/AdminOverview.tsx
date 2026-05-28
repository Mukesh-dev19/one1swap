import { useEffect, useState } from "react";
import { useAdmin } from "@/contexts/AdminContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Package, UserCheck, Clock, MessageSquare, UsersRound, Megaphone, Sparkles, ShieldAlert } from "lucide-react";

const AdminOverview = () => {
  const { adminRequest } = useAdmin();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminRequest("getOverview").then(setData).finally(() => setLoading(false));
  }, [adminRequest]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const statCards = [
    { label: "Total Users", value: data?.totalUsers ?? 0, icon: Users, color: "text-blue-500" },
    { label: "Active Users", value: data?.activeUsers ?? 0, icon: UserCheck, color: "text-green-500" },
    { label: "Blocked Users", value: data?.blockedUsers ?? 0, icon: ShieldAlert, color: "text-red-500" },
    { label: "Resources", value: data?.totalResources ?? 0, icon: Package, color: "text-purple-500" },
    { label: "Messages", value: data?.totalMessages ?? 0, icon: MessageSquare, color: "text-cyan-500" },
    { label: "Groups", value: data?.totalGroups ?? 0, icon: UsersRound, color: "text-indigo-500" },
    { label: "Active Ads", value: data?.totalAds ?? 0, icon: Sparkles, color: "text-pink-500" },
    { label: "Active Announcements", value: data?.totalAnnouncements ?? 0, icon: Megaphone, color: "text-amber-500" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold">Dashboard Overview</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-11 w-11 rounded-xl bg-muted flex items-center justify-center ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{s.label}</p>
                <p className="text-xl font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Recent Users</CardTitle></CardHeader>
          <CardContent>
            {data?.recentUsers?.length ? (
              <div className="space-y-3">
                {data.recentUsers.map((u: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{u.full_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[u.department, u.college].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </div>
                    <span className="text-muted-foreground text-xs flex items-center gap-1 shrink-0">
                      <Clock className="h-3 w-3" />
                      {new Date(u.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No recent users</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Recent Resources</CardTitle></CardHeader>
          <CardContent>
            {data?.recentResources?.length ? (
              <div className="space-y-3">
                {data.recentResources.map((r: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{r.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {r.category} · {r.price ? `₹${r.price}` : "Free"}
                      </p>
                    </div>
                    <span className="text-muted-foreground text-xs flex items-center gap-1 shrink-0">
                      <Clock className="h-3 w-3" />
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No recent resources</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminOverview;

