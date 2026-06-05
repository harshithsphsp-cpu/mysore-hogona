"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserPlus, RefreshCw, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
  },
];

export default function TeamManagementPage() {
  const [members, setMembers] = useState<typeof DEFAULT_MEMBERS>(DEFAULT_MEMBERS);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Member");
  const [status, setStatus] = useState("Active");

  useEffect(() => {
    const stored = localStorage.getItem("teamMembers");
    if (stored) {
      try {
        setMembers(JSON.parse(stored));
      } catch (e) {
        // Fallback to defaults
      }
    } else {
      localStorage.setItem("teamMembers", JSON.stringify(DEFAULT_MEMBERS));
    }
  }, []);

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    const newMember = {
      id: Date.now().toString(),
      name: name.trim(),
      email: email.trim(),
      role,
      status,
      assignedContacts: 0,
      completedCalls: 0,
      performance: "0%",
    };
    const updated = [...members, newMember];
    setMembers(updated);
    localStorage.setItem("teamMembers", JSON.stringify(updated));
    toast.success(`${name} has been added to the team`);
    
    // Reset form & close
    setName("");
    setEmail("");
    setRole("Member");
    setStatus("Active");
    setOpen(false);
  };

  const handleDeleteMember = (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove ${name}?`)) {
      const updated = members.filter(m => m.id !== id);
      setMembers(updated);
      localStorage.setItem("teamMembers", JSON.stringify(updated));
      toast.success(`${name} has been removed from the team`);
    }
  };

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
            <DialogTrigger
              render={
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" /> Invite Member
                </Button>
              }
            />
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
                <div className="grid grid-cols-2 gap-4">
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
                  <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <select
                      id="status"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="Active">Active</option>
                      <option value="Away">Away</option>
                    </select>
                  </div>
                </div>
                <DialogFooter className="pt-4">
                  <Button type="submit">Add Member</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
            <p className="text-xs text-muted-foreground">
              {members.filter((m) => m.status === "Active").length} active, {members.filter((m) => m.status === "Away").length} away
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {members.length
                ? Math.round(members.reduce((acc, m) => acc + (parseInt(m.performance) || 0), 0) / members.length)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Based on current team performance</p>
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

      <Card>
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
                      <div className={`h-2 w-2 rounded-full ${member.status === "Active" ? "bg-green-500" : "bg-yellow-500"}`} />
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
                        onClick={() => handleDeleteMember(member.id, member.name)}
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
    </div>
  );
}
