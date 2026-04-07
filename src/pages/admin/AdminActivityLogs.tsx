import { useEffect, useState } from "react";
import { useAdmin } from "@/contexts/AdminContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Upload } from "lucide-react";

const iconMap: Record<string, any> = {
  registration: UserPlus,
  upload: Upload,
};

const colorMap: Record<string, string> = {
  registration: "bg-blue-500/10 text-blue-500",
  upload: "bg-green-500/10 text-green-500",
};

const AdminActivityLogs = () => {
  const { adminRequest } = useAdmin();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminRequest("getActivityLogs").then(setLogs).finally(() => setLoading(false));
  }, [adminRequest]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold">Activity Logs</h1>

      <Card>
        <CardContent className="p-0">
          {logs.length ? (
            <div className="divide-y divide-border">
              {logs.map((log, i) => {
                const Icon = iconMap[log.type] || Upload;
                return (
                  <div key={i} className="flex items-center gap-4 p-4">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${colorMap[log.type] || "bg-muted"}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{log.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 capitalize">{log.type}</Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">No activity logs</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminActivityLogs;
