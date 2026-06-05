"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, PhoneCall, CheckCircle2, AlertCircle, BarChart3, Loader2, RefreshCw } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

export default function DashboardPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalContacts: 0,
    callsCompleted: 0,
    followUpsDue: 0,
    completionRate: 0,
  });
  const [activities, setActivities] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        const isMock = !user || !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("dummy");
        
        if (isMock) {
          const localContacts = JSON.parse(localStorage.getItem("contacts") || "[]");
          const localFollowups = JSON.parse(localStorage.getItem("followUps") || "[]");
          
          const total = localContacts.length;
          const completed = localContacts.filter((c: any) => c.status !== "Not Called").length;
          const rate = total ? Math.round((completed / total) * 100) : 0;
          
          setStats({
            totalContacts: total,
            callsCompleted: completed,
            followUpsDue: localFollowups.filter((f: any) => f.status === "pending" || f.dbStatus === "pending").length,
            completionRate: rate
          });

          const interested = localContacts.filter((c: any) => c.status === "Interested").length;
          const notInterested = localContacts.filter((c: any) => c.status === "Not Interested").length;
          const busy = localContacts.filter((c: any) => c.status === "Busy").length;
          const callback = localContacts.filter((c: any) => c.status === "Callback Scheduled").length;
          const notCalled = localContacts.filter((c: any) => c.status === "Not Called").length;

          setChartData([
            { name: "Not Called", count: notCalled },
            { name: "Busy", count: busy },
            { name: "Callback", count: callback },
            { name: "Not Interested", count: notInterested },
            { name: "Interested", count: interested },
          ]);

          setActivities([
            { id: "1", user: "Harshith", action: "called John Doe", time: "15m ago" },
            { id: "2", user: "Abhinav", action: "called Jane Smith", time: "45m ago" },
            { id: "3", user: "Ganesh", action: "scheduled callback for Robert Johnson", time: "2h ago" },
          ]);
          setLoading(false);
          return;
        }

        // Get organization ID
        const { data: members } = await supabase
          .from("organization_members")
          .select("organization_id")
          .eq("user_id", user.id);

        if (members && members.length > 0) {
          const orgId = members[0].organization_id;

          // 1. Total Contacts count
          const { count: totalCount, error: err1 } = await supabase
            .from("contacts")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", orgId);
          if (err1) throw err1;

          // 2. Calls Completed count (status !== 'Not Called')
          const { count: completedCount, error: err2 } = await supabase
            .from("contacts")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", orgId)
            .not("status", "eq", "Not Called");
          if (err2) throw err2;

          // 3. Follow-ups Pending count
          const { count: pendingFollowups, error: err3 } = await supabase
            .from("follow_ups")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", orgId)
            .eq("status", "pending");
          if (err3) throw err3;

          // 4. Interested Leads count for chart/conversion
          const { data: contactsData } = await supabase
            .from("contacts")
            .select("status, created_at")
            .eq("organization_id", orgId);

          const total = totalCount || 0;
          const completed = completedCount || 0;
          const rate = total ? Math.round((completed / total) * 100) : 0;

          setStats({
            totalContacts: total,
            callsCompleted: completed,
            followUpsDue: pendingFollowups || 0,
            completionRate: rate,
          });

          // Process Chart Data (calls per status type)
          const interested = contactsData?.filter(c => c.status === "Interested").length || 0;
          const notInterested = contactsData?.filter(c => c.status === "Not Interested").length || 0;
          const busy = contactsData?.filter(c => c.status === "Busy").length || 0;
          const callback = contactsData?.filter(c => c.status === "Callback Scheduled").length || 0;
          const notCalled = contactsData?.filter(c => c.status === "Not Called").length || 0;

          setChartData([
            { name: "Not Called", count: notCalled },
            { name: "Busy", count: busy },
            { name: "Callback", count: callback },
            { name: "Not Interested", count: notInterested },
            { name: "Interested", count: interested },
          ]);

          // 5. Fetch Recent Activities from activity_logs join profiles
          const { data: logsData } = await supabase
            .from("activity_logs")
            .select(`
              id,
              action,
              entity_type,
              created_at,
              profiles(first_name, last_name)
            `)
            .eq("organization_id", orgId)
            .order("created_at", { ascending: false })
            .limit(5);

          if (logsData) {
            const formattedLogs = logsData.map((log: any) => {
              const name = log.profiles ? `${log.profiles.first_name || ""} ${log.profiles.last_name || ""}`.trim() : "System";
              const timeString = new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return {
                id: log.id,
                user: name,
                action: `${log.action} a ${log.entity_type}`,
                time: timeString,
              };
            });
            setActivities(formattedLogs);
          }
        }
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || "Failed to load dashboard statistics");
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Welcome back! Here's a real-time overview of your Mysore Hogona campaign performance.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Assigned Contacts</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalContacts}</div>
                <p className="text-xs text-muted-foreground">Contacts in your outreach lists</p>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Calls Completed</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.callsCompleted}</div>
                <p className="text-xs text-muted-foreground">Leads contacted at least once</p>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Follow-ups Pending</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.followUpsDue}</div>
                <p className="text-xs text-muted-foreground">Tasks needing attention</p>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.completionRate}%</div>
                <p className="text-xs text-muted-foreground">Overall contact calling percentage</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4 bg-card">
              <CardHeader>
                <CardTitle>Outreach Metrics</CardTitle>
                <CardDescription>Distribution of contacts by calling status.</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {stats.totalContacts === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-2">
                    <BarChart3 className="h-10 w-10 text-muted-foreground/50 animate-pulse" />
                    <p className="text-sm font-medium">No contact data available yet</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
                        itemStyle={{ color: "hsl(var(--foreground))" }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="col-span-3 bg-card">
              <CardHeader>
                <CardTitle>Recent Activity Log</CardTitle>
                <CardDescription>Latest updates from your outreach team.</CardDescription>
              </CardHeader>
              <CardContent>
                {activities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground space-y-2">
                    <RefreshCw className="h-8 w-8 text-muted-foreground/45" />
                    <p className="text-sm font-medium">No activity registered yet</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {activities.map((activity) => (
                      <div key={activity.id} className="flex items-center">
                        <span className="relative flex h-2 w-2 mr-4 rounded-full bg-primary" />
                        <div className="space-y-1 flex-1">
                          <p className="text-sm font-medium leading-none">
                            {activity.user}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {activity.action}
                          </p>
                        </div>
                        <div className="ml-auto font-medium text-xs text-muted-foreground">
                          {activity.time}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
