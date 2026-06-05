"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserPlus, RefreshCw, Settings2, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEFAULT_MEMBERS = [
  {
    id: "1",
    name: "Harshith",
    email: "harshith@mysorehogona.com",
    role: "Admin",
    status: "Active",
    assignedContacts: 120,
    completedCalls: 90,
    performance: "75%",
    perfValue: 75
  },
  {
    id: "2",
    name: "Abhinav",
    email: "abhinav@mysorehogona.com",
    role: "Member",
    status: "Active",
    assignedContacts: 150,
    completedCalls: 120,
    performance: "80%",
    perfValue: 80
  },
  {
    id: "3",
    name: "Ganesh",
    email: "ganesh@mysorehogona.com",
    role: "Member",
    status: "Active",
    assignedContacts: 100,
    completedCalls: 70,
    performance: "70%",
    perfValue: 70
  },
  {
    id: "4",
    name: "Kushaal",
    email: "kushaal@mysorehogona.com",
    role: "Admin",
    status: "Active",
    assignedContacts: 200,
    completedCalls: 180,
    performance: "90%",
    perfValue: 90
  },
  {
    id: "5",
    name: "Arnav",
    email: "arnav@mysorehogona.com",
    role: "Member",
    status: "Active",
    assignedContacts: 140,
    completedCalls: 100,
    performance: "71%",
    perfValue: 71
  },
  {
    id: "6",
    name: "Aadith",
    email: "aadith@mysorehogona.com",
    role: "Member",
    status: "Active",
    assignedContacts: 80,
    completedCalls: 60,
    performance: "75%",
    perfValue: 75
  },
];

export default function TeamManagementPage() {
  const supabase = createClient();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Add member form state
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Member");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLocalMock = () => {
    return !orgId || orgId === "mock-org-id" || !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("dummy");
  };

  useEffect(() => {
    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const isMock = !user || !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("dummy");
        
        if (isMock) {
          setOrgId("mock-org-id");
          setUserId("mock-user-id");
          loadLocalTeam();
          return;
        }

        setUserId(user.id);
        const { data: membersData } = await supabase
          .from("organization_members")
          .select("organization_id")
          .eq("user_id", user.id);

        if (membersData && membersData.length > 0) {
          const currentOrgId = membersData[0].organization_id;
          setOrgId(currentOrgId);
          await loadTeam(currentOrgId, user.id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        setOrgId("mock-org-id");
        setUserId("mock-user-id");
        loadLocalTeam();
      }
    }
    init();
  }, []);

  const loadLocalTeam = () => {
    setLoading(true);
    let localTeam = localStorage.getItem("teamMembers");
    if (!localTeam) {
      localStorage.setItem("teamMembers", JSON.stringify(DEFAULT_MEMBERS));
      localTeam = JSON.stringify(DEFAULT_MEMBERS);
    }
    const parsed = JSON.parse(localTeam);
    const localContacts = JSON.parse(localStorage.getItem("contacts") || "[]");
    
    const processed = parsed.map((m: any) => {
      const contacts = localContacts.filter((c: any) => c.assigned_member_id === m.id);
      if (contacts.length > 0) {
        const assignedContacts = contacts.length;
        const completedCalls = contacts.filter((c: any) => c.status !== "Not Called").length;
        const perf = Math.round((completedCalls / assignedContacts) * 100);
        return {
          ...m,
          assignedContacts,
          completedCalls,
          performance: `${perf}%`,
          perfValue: perf
        };
      }
      return {
        ...m,
        assignedContacts: m.assignedContacts || 0,
        completedCalls: m.completedCalls || 0,
        performance: m.performance || "0%",
        perfValue: m.perfValue || 0
      };
    });

    setMembers(processed);
    setLoading(false);
  };

  const loadTeam = async (currentOrgId: string, loggedInUserId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("organization_members")
        .select(`
          id,
          role,
          user_id,
          profiles(id, email, first_name, last_name),
          contacts(id, status)
        `)
        .eq("organization_id", currentOrgId);

      if (error) throw error;

      if (data) {
        // If only 1 member exists (the logged in user), auto-seed the default team list
        if (data.length === 1 && data[0].user_id === loggedInUserId) {
          await seedDefaultTeam(currentOrgId);
          await loadTeam(currentOrgId, loggedInUserId);
          return;
        }

        const formatted = data.map((item: any) => {
          const p = item.profiles;
          const contacts = item.contacts || [];
          const assignedContacts = contacts.length;
          const completedCalls = contacts.filter((c: any) => c.status !== "Not Called").length;
          const perf = assignedContacts ? Math.round((completedCalls / assignedContacts) * 100) : 0;

          return {
            id: item.id,
            userId: item.user_id,
            name: p ? `${p.first_name || ""} ${p.last_name || ""}`.trim() : "Unknown",
            email: p ? p.email : "",
            role: item.role === "org_admin" || item.role === "super_admin" ? "Admin" : "Member",
            status: "Active",
            assignedContacts,
            completedCalls,
            performance: `${perf}%`,
            perfValue: perf
          };
        });
        setMembers(formatted);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load team members");
    } finally {
      setLoading(false);
    }
  };

  const seedDefaultTeam = async (currentOrgId: string) => {
    const defaultTeam = [
      { first_name: "Harshith", last_name: "", email: "harshith@mysorehogona.com", role: "org_admin" },
      { first_name: "Abhinav", last_name: "", email: "abhinav@mysorehogona.com", role: "member" },
      { first_name: "Ganesh", last_name: "", email: "ganesh@mysorehogona.com", role: "member" },
      { first_name: "Kushaal", last_name: "", email: "kushaal@mysorehogona.com", role: "org_admin" },
      { first_name: "Arnav", last_name: "", email: "arnav@mysorehogona.com", role: "member" },
      { first_name: "Aadith", last_name: "", email: "aadith@mysorehogona.com", role: "member" },
    ];

    for (const m of defaultTeam) {
      const mockUuid = crypto.randomUUID();
      const { error: err1 } = await supabase
        .from("profiles")
        .insert({
          id: mockUuid,
          email: m.email,
          first_name: m.first_name,
          last_name: m.last_name,
          system_role: m.role
        });

      if (!err1) {
        await supabase
          .from("organization_members")
          .insert({
            organization_id: currentOrgId,
            user_id: mockUuid,
            role: m.role
          });
      }
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;
    if (!name.trim() || !email.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const first = name.trim().split(" ")[0];
      const last = name.trim().split(" ").slice(1).join(" ") || "";
      
      if (isLocalMock()) {
        const localTeam = JSON.parse(localStorage.getItem("teamMembers") || "[]");
        const newMember = {
          id: Date.now().toString(),
          name: name.trim(),
          email: email.trim(),
          role: role,
          status: "Active",
          assignedContacts: 0,
          completedCalls: 0,
          performance: "0%",
          perfValue: 0
        };
        localStorage.setItem("teamMembers", JSON.stringify([...localTeam, newMember]));
        toast.success(`${name} added to the team`);
        setName("");
        setEmail("");
        setRole("Member");
        setOpen(false);
        loadLocalTeam();
        return;
      }

      const mockUuid = crypto.randomUUID();
      const sysRole = role === "Admin" ? "org_admin" : "member";

      // 1. Insert Profile
      const { error: profError } = await supabase
        .from("profiles")
        .insert({
          id: mockUuid,
          email: email.trim(),
          first_name: first,
          last_name: last,
          system_role: sysRole
        });

      if (profError) throw profError;

      // 2. Insert organization member
      const { error: memberError } = await supabase
        .from("organization_members")
        .insert({
          organization_id: orgId,
          user_id: mockUuid,
          role: sysRole
        });

      if (memberError) throw memberError;

      // 3. Log Activity
      await supabase.from("activity_logs").insert({
        organization_id: orgId,
        user_id: userId,
        action: "added",
        entity_type: "member",
        entity_id: mockUuid,
        new_value: { name, email, role }
      });

      toast.success(`${name} has been added to the team`);
      setName("");
      setEmail("");
      setRole("Member");
      setOpen(false);
      if (userId) loadTeam(orgId, userId);
    } catch (err: any) {
      toast.error(err.message || "Failed to add member");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMember = async (memberRecordId: string, memberUserId: string, name: string) => {
    if (memberUserId === userId) {
      toast.error("You cannot remove yourself from the team!");
      return;
    }
    if (!confirm(`Are you sure you want to remove ${name} from the team?`)) return;

    if (isLocalMock()) {
      const localTeam = JSON.parse(localStorage.getItem("teamMembers") || "[]");
      const updated = localTeam.filter((m: any) => m.id !== memberRecordId);
      localStorage.setItem("teamMembers", JSON.stringify(updated));
      toast.success(`${name} has been removed from the team`);
      loadLocalTeam();
      return;
    }

    try {
      // 1. Delete from organization_members
      const { error: err1 } = await supabase
        .from("organization_members")
        .delete()
        .eq("id", memberRecordId);

      if (err1) throw err1;

      // 2. Clean up profile if it was generated by client-side UUID seeding
      await supabase
        .from("profiles")
        .delete()
        .eq("id", memberUserId);

      toast.success(`${name} has been removed from the team`);
      if (orgId && userId) loadTeam(orgId, userId);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete team member");
    }
  };

  const avgPerf = members.length
    ? Math.round(members.reduce((acc, m) => acc + (m.perfValue || 0), 0) / members.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-heading">Team Management</h2>
          <p className="text-muted-foreground">Manage your team members and their assignments.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" /> Rebalance Assignments
          </Button>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={
              <Button>
                <UserPlus className="mr-2 h-4 w-4" /> Invite Member
              </Button>
            } />
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Invite Member</DialogTitle>
                <DialogDescription>
                  Add a new team member to your Mysore Hogona organization.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddMember} className="space-y-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g. John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="e.g. john@mysorehogona.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Role</Label>
                  <select
                    id="role"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="Member">Member</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                <DialogFooter className="pt-4">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Member
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Team Members</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{members.length}</div>
                <p className="text-xs text-muted-foreground">Members in your organization</p>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Completion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgPerf}%</div>
                <p className="text-xs text-muted-foreground">Based on contacts called vs assigned</p>
              </CardContent>
            </Card>
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-primary">Assignment Engine Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">Balanced</div>
                <p className="text-xs text-primary/80">Fair distribution active</p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Team Directory</CardTitle>
              <CardDescription>View and manage all members in your organization.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Assigned</TableHead>
                    <TableHead className="text-right">Completed</TableHead>
                    <TableHead className="text-right">Performance</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={`https://avatar.vercel.sh/${member.name}`} />
                          <AvatarFallback>{member.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{member.name}</div>
                          <div className="text-xs text-muted-foreground">{member.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.role === "Admin" ? "default" : "secondary"}>
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-green-500" />
                          <span className="text-sm">{member.status}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{member.assignedContacts}</TableCell>
                      <TableCell className="text-right">{member.completedCalls}</TableCell>
                      <TableCell className="text-right">{member.performance}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon">
                            <Settings2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                            onClick={() => handleDeleteMember(member.id, member.userId || member.id, member.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
