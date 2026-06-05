"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Clock, Phone, MoreHorizontal, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

export default function FollowUpsPage() {
  const supabase = createClient();
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [filter, setFilter] = useState("All");

  const isLocalMock = () => {
    return !orgId || orgId === "mock-org-id" || !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("dummy");
  };

  const loadLocalFollowUps = () => {
    setLoading(true);
    const localContacts = JSON.parse(localStorage.getItem("contacts") || "[]");
    const localFollowUps = JSON.parse(localStorage.getItem("followUps") || "[]");

    const processed = localFollowUps.map((f: any) => {
      const contact = localContacts.find((c: any) => c.id === f.contact_id) || {};
      const dueDateObj = new Date(f.due_date);
      const today = new Date();
      
      let displayStatus = "Upcoming";
      if (f.status === "completed") {
        displayStatus = "Completed";
      } else if (dueDateObj < today && dueDateObj.toDateString() !== today.toDateString()) {
        displayStatus = "Overdue";
      } else if (dueDateObj.toDateString() === today.toDateString()) {
        displayStatus = "Today";
      }

      return {
        id: f.id,
        contactName: `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || "Unknown Lead",
        time: dueDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: f.due_date,
        status: displayStatus,
        dbStatus: f.status || "pending",
        notes: f.notes || "No additional notes.",
        phone: contact.phone_number || "No Phone",
      };
    });
    setFollowUps(processed);
    setLoading(false);
  };

  useEffect(() => {
    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const isMock = !user || !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("dummy");
        
        if (isMock) {
          setOrgId("mock-org-id");
          loadLocalFollowUps();
          return;
        }

        const { data: members } = await supabase
          .from("organization_members")
          .select("organization_id")
          .eq("user_id", user.id);

        if (members && members.length > 0) {
          const currentOrgId = members[0].organization_id;
          setOrgId(currentOrgId);
          await loadFollowUps(currentOrgId);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        setOrgId("mock-org-id");
        loadLocalFollowUps();
      }
    }
    init();
  }, []);

  const loadFollowUps = async (currentOrgId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("follow_ups")
        .select(`
          *,
          contacts(id, first_name, last_name, phone_number, email)
        `)
        .eq("organization_id", currentOrgId)
        .order("due_date", { ascending: true });

      if (error) throw error;

      if (data) {
        const processed = data.map((f: any) => {
          const c = f.contacts || {};
          const dueDateObj = new Date(f.due_date);
          const today = new Date();
          
          let displayStatus = "Upcoming";
          if (f.status === "completed") {
            displayStatus = "Completed";
          } else if (dueDateObj < today && dueDateObj.toDateString() !== today.toDateString()) {
            displayStatus = "Overdue";
          } else if (dueDateObj.toDateString() === today.toDateString()) {
            displayStatus = "Today";
          }

          return {
            id: f.id,
            contactName: `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Unknown Lead",
            time: dueDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            date: f.due_date,
            status: displayStatus,
            dbStatus: f.status,
            notes: f.notes || "No additional notes.",
            phone: c.phone_number || "No Phone",
          };
        });
        setFollowUps(processed);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load follow-ups");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteFollowUp = async (id: string) => {
    if (isLocalMock()) {
      const localFollowUps = JSON.parse(localStorage.getItem("followUps") || "[]");
      const updated = localFollowUps.map((f: any) => f.id === id ? { ...f, status: "completed" } : f);
      localStorage.setItem("followUps", JSON.stringify(updated));
      toast.success("Follow-up marked as completed");
      loadLocalFollowUps();
      return;
    }

    try {
      const { error } = await supabase
        .from("follow_ups")
        .update({ status: "completed" })
        .eq("id", id);
      
      if (error) throw error;
      toast.success("Follow-up marked as completed");
      if (orgId) loadFollowUps(orgId);
    } catch (err: any) {
      toast.error(err.message || "Failed to update follow-up");
    }
  };

  const handleDeleteFollowUp = async (id: string) => {
    if (!confirm("Are you sure you want to delete this follow-up?")) return;

    if (isLocalMock()) {
      const localFollowUps = JSON.parse(localStorage.getItem("followUps") || "[]");
      const updated = localFollowUps.filter((f: any) => f.id !== id);
      localStorage.setItem("followUps", JSON.stringify(updated));
      toast.success("Follow-up deleted");
      loadLocalFollowUps();
      return;
    }

    try {
      const { error } = await supabase
        .from("follow_ups")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      toast.success("Follow-up deleted");
      if (orgId) loadFollowUps(orgId);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete follow-up");
    }
  };

  const filteredFollowUps = followUps.filter((f) => {
    if (filter === "All") return true;
    if (filter === "Completed") return f.dbStatus === "completed";
    if (filter === "Overdue") return f.status === "Overdue";
    if (filter === "Today") return f.status === "Today";
    if (filter === "Upcoming") return f.status === "Upcoming" && f.dbStatus === "pending";
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Follow-Ups</h2>
          <p className="text-muted-foreground">Manage your scheduled calls and reminders dynamically.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="bg-background">
            <CalendarIcon className="mr-2 h-4 w-4" /> Calendar View
          </Button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {["All", "Overdue", "Today", "Upcoming", "Completed"].map((status) => (
          <Button
            key={status}
            variant={filter === status ? "default" : "outline"}
            onClick={() => setFilter(status)}
            className="rounded-full"
          >
            {status}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredFollowUps.length === 0 ? (
        <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-16 text-center space-y-4 bg-card">
          <CalendarIcon className="h-16 w-16 text-muted-foreground" />
          <h3 className="text-xl font-bold">No follow-ups</h3>
          <p className="text-muted-foreground max-w-md">
            No scheduled follow-up tasks found for this selection. Follow-ups can be scheduled when logging calls in the contacts directory.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredFollowUps.map((followUp) => (
            <Card key={followUp.id} className={`${followUp.status === "Overdue" ? "border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/10" : ""} bg-card`}>
              <CardContent className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6">
                <div className="flex flex-col md:flex-row md:items-center gap-4 flex-1">
                  <div className="flex flex-col items-center justify-center p-3 bg-muted rounded-lg w-20 flex-shrink-0">
                    <span className="text-xs font-semibold uppercase text-muted-foreground">
                      {new Date(followUp.date).toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                    <span className="text-2xl font-bold">
                      {new Date(followUp.date).getDate()}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-lg">{followUp.contactName}</h4>
                      <Badge variant={
                        followUp.status === "Overdue" ? "destructive" :
                        followUp.status === "Today" ? "default" : "secondary"
                      }>
                        {followUp.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {followUp.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" /> {followUp.phone}
                      </span>
                    </div>
                    <p className="text-sm mt-2">{followUp.notes}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto mt-4 md:mt-0">
                  {followUp.dbStatus === "pending" && (
                    <Button className="flex-1 md:flex-none" onClick={() => handleCompleteFollowUp(followUp.id)}>
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Completed
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20" onClick={() => handleDeleteFollowUp(followUp.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="h-9 w-9 p-0 flex items-center justify-center rounded-md hover:bg-muted">
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Reschedule</DropdownMenuItem>
                      <DropdownMenuItem>Edit Notes</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
