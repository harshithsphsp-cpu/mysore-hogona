"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, PhoneCall, CheckCircle2, AlertCircle, BarChart3 } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const performanceData = [
  { name: "Mon", calls: 40, interested: 24, amt: 2400 },
  { name: "Tue", calls: 30, interested: 13, amt: 2210 },
  { name: "Wed", calls: 20, interested: 38, amt: 2290 },
  { name: "Thu", calls: 27, interested: 39, amt: 2000 },
  { name: "Fri", calls: 18, interested: 48, amt: 2181 },
  { name: "Sat", calls: 23, interested: 38, amt: 2500 },
  { name: "Sun", calls: 34, interested: 43, amt: 2100 },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Welcome back! Here's an overview of your team's performance.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assigned</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,204</div>
            <p className="text-xs text-muted-foreground">+20.1% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calls Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">842</div>
            <p className="text-xs text-muted-foreground">+19% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Follow-ups Due</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">34</div>
            <p className="text-xs text-muted-foreground">12 overdue</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">70%</div>
            <p className="text-xs text-muted-foreground">+4% from last week</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Weekly Performance</CardTitle>
            <CardDescription>Calls vs Interested Leads over the past week.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Bar dataKey="calls" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="interested" fill="hsl(var(--primary) / 0.5)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates from your team.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {[
                { id: 1, member: "Harshith", contact: "John Doe", action: "called", status: 'Status updated to "Interested"', time: "15m ago" },
                { id: 2, member: "Abhinav", contact: "Jane Smith", action: "called", status: "No response, scheduled follow-up", time: "45m ago" },
                { id: 3, member: "Ganesh", contact: "Robert Johnson", action: "updated", status: "Confirmed registration for event", time: "2h ago" },
                { id: 4, member: "Kushaal", contact: "Emily Davis", action: "reassigned", status: "Lead assigned to Arnav", time: "3h ago" },
                { id: 5, member: "Aadith", contact: "Sarah Wilson", action: "called", status: 'Status updated to "Busy"', time: "5h ago" },
              ].map((activity) => (
                <div key={activity.id} className="flex items-center">
                  <span className="relative flex h-2 w-2 mr-4 rounded-full bg-primary" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {activity.member} {activity.action} {activity.contact}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {activity.status}
                    </p>
                  </div>
                  <div className="ml-auto font-medium text-xs text-muted-foreground">
                    {activity.time}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
