import { useEffect, useState } from "react";
import { useAdmin } from "@/contexts/AdminContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Search, Shield, ShieldOff, Trash2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const AdminUsers = () => {
  const { adminRequest } = useAdmin();
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const fetchUsers = () => {
    setLoading(true);
    adminRequest("getUsers").then(setUsers).finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleBlock = async (userId: string, block: boolean) => {
    await adminRequest(block ? "blockUser" : "unblockUser", { userId });
    toast({ title: block ? "User blocked" : "User unblocked" });
    fetchUsers();
  };

  const handleDelete = async (userId: string) => {
    await adminRequest("deleteUser", { userId });
    toast({ title: "User deleted" });
    fetchUsers();
  };

  const filtered = users.filter((u) =>
    (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold">User Management</h1>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-12">
              <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="hidden sm:table-cell">Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Uploads</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{u.email}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{u.department || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={u.is_blocked ? "destructive" : "secondary"}>
                        {u.is_blocked ? "Blocked" : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{u.upload_count}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setSelectedUser(u)} title="View"><Eye className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => handleBlock(u.user_id, !u.is_blocked)} title={u.is_blocked ? "Unblock" : "Block"}>
                          {u.is_blocked ? <ShieldOff className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete user?</AlertDialogTitle>
                              <AlertDialogDescription>This will permanently delete {u.full_name || "this user"} and all their data.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(u.user_id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!filtered.length && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No users found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>User Details</DialogTitle></DialogHeader>
          {selectedUser && (
            <div className="space-y-3 text-sm">
              <div><span className="font-medium text-muted-foreground">Name:</span> {selectedUser.full_name || "—"}</div>
              <div><span className="font-medium text-muted-foreground">Email:</span> {selectedUser.email}</div>
              <div><span className="font-medium text-muted-foreground">Department:</span> {selectedUser.department || "—"}</div>
              <div><span className="font-medium text-muted-foreground">College:</span> {selectedUser.college || "—"}</div>
              <div><span className="font-medium text-muted-foreground">Campus:</span> {selectedUser.campus || "—"}</div>
              <div><span className="font-medium text-muted-foreground">Year:</span> {selectedUser.year_of_study || "—"}</div>
              <div><span className="font-medium text-muted-foreground">Uploads:</span> {selectedUser.upload_count}</div>
              <div><span className="font-medium text-muted-foreground">Status:</span> {selectedUser.is_blocked ? "Blocked" : "Active"}</div>
              <div><span className="font-medium text-muted-foreground">Joined:</span> {new Date(selectedUser.created_at).toLocaleDateString()}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
