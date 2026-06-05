"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Clock, Phone, MoreHorizontal, CheckCircle2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const followUps = [
  {
    id: "1",
    contactName: "Michael Scott",
    company: "Dunder Mifflin",
    time: "10:00 AM",
    date: "2026-06-02",
    status: "Overdue",
    notes: "Call back about the paper supply order",
    phone: "+1 570 555 1234",
  },
  {
    id: "2",
    contactName: "Pam Beesly",
    company: "Dunder Mifflin",
    time: "2:30 PM",
    date: "2026-06-02",
    status: "Today",
    notes: "Follow up on the art project sponsorship",
    phone: "+1 570 555 5678",
  },
  {
    id: "3",
    contactName: "Jim Halpert",
    company: "Athlead",
    time: "11:15 AM",
    date: "2026-06-03",
    status: "Upcoming",
    notes: "Discuss sports marketing event",
    phone: "+1 215 555 9012",
  },
];

export default function FollowUpsPage() {
  const [filter, setFilter] = useState("All");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Follow-Ups</h2>
          <p className="text-muted-foreground">Manage your scheduled calls and reminders.</p>
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

      <div className="grid gap-4">
        {followUps
          .filter((f) => filter === "All" || f.status === filter)
          .map((followUp) => (
          <Card key={followUp.id} className={followUp.status === "Overdue" ? "border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/10" : ""}>
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
                <Button className="flex-1 md:flex-none">
                  <Phone className="mr-2 h-4 w-4" /> Call Now
                </Button>
                <Button variant="outline" size="icon" title="Mark as Completed">
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger className="h-9 w-9 p-0 flex items-center justify-center rounded-md hover:bg-muted">
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Reschedule</DropdownMenuItem>
                    <DropdownMenuItem>Edit Notes</DropdownMenuItem>
                    <DropdownMenuItem>View Contact</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
