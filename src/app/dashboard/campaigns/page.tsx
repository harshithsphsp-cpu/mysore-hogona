"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Plus, MoreVertical, Play, Pause, CheckSquare } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const campaigns = [
  {
    id: "1",
    name: "Summer Event 2026",
    status: "Active",
    progress: 72,
    totalContacts: 2500,
    called: 1800,
    interested: 420,
    dueDate: "2026-07-15",
  },
  {
    id: "2",
    name: "Q3 Tech Conference",
    status: "Paused",
    progress: 45,
    totalContacts: 1200,
    called: 540,
    interested: 85,
    dueDate: "2026-09-01",
  },
  {
    id: "3",
    name: "Spring Webinar Recap",
    status: "Completed",
    progress: 100,
    totalContacts: 850,
    called: 850,
    interested: 120,
    dueDate: "2026-05-20",
  },
];

export default function CampaignsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Campaigns</h2>
          <p className="text-muted-foreground">Manage your event outreach campaigns.</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> New Campaign
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {campaigns.map((campaign) => (
          <Card key={campaign.id} className="flex flex-col">
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div>
                <CardTitle className="text-xl">{campaign.name}</CardTitle>
                <CardDescription className="mt-1 text-xs">
                  Due {new Date(campaign.dueDate).toLocaleDateString()}
                </CardDescription>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger className="h-8 w-8 p-0 flex items-center justify-center rounded-md hover:bg-muted">
                  <span className="sr-only">Open menu</span>
                  <MoreVertical className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>View details</DropdownMenuItem>
                  <DropdownMenuItem>Edit campaign</DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              <div className="flex items-center justify-between">
                <Badge 
                  variant={
                    campaign.status === "Active" ? "default" : 
                    campaign.status === "Completed" ? "secondary" : "outline"
                  }
                >
                  {campaign.status}
                </Badge>
                <span className="text-sm font-medium text-muted-foreground">
                  {campaign.progress}%
                </span>
              </div>
              
              <Progress value={campaign.progress} className="h-2" />
              
              <div className="grid grid-cols-2 gap-4 pt-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Total Contacts</div>
                  <div className="font-semibold">{campaign.totalContacts}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Called</div>
                  <div className="font-semibold">{campaign.called}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Interested</div>
                  <div className="font-semibold text-green-600 dark:text-green-500">{campaign.interested}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Conversion</div>
                  <div className="font-semibold">
                    {Math.round((campaign.interested / campaign.called) * 100) || 0}%
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t bg-muted/20 pt-4">
              <div className="flex w-full gap-2">
                {campaign.status === "Paused" && (
                  <Button variant="outline" className="w-full">
                    <Play className="mr-2 h-4 w-4" /> Resume
                  </Button>
                )}
                {campaign.status === "Active" && (
                  <Button variant="outline" className="w-full">
                    <Pause className="mr-2 h-4 w-4" /> Pause
                  </Button>
                )}
                {campaign.status !== "Completed" && (
                  <Button variant="secondary" className="w-full">
                    <CheckSquare className="mr-2 h-4 w-4" /> Complete
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
