"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Plus, MoreVertical, Play, Pause, CheckSquare, Upload, Loader2, FileSpreadsheet } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { createClient } from "@/utils/supabase/client";
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

export default function CampaignsPage() {
  const supabase = createClient();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Form states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);

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
          loadLocalCampaigns();
          return;
        }

        setUserId(user.id);
        const { data: members } = await supabase
          .from("organization_members")
          .select("organization_id")
          .eq("user_id", user.id);

        if (members && members.length > 0) {
          const currentOrgId = members[0].organization_id;
          setOrgId(currentOrgId);
          await loadCampaigns(currentOrgId);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Initialization error", err);
        // Fallback on error
        setOrgId("mock-org-id");
        setUserId("mock-user-id");
        loadLocalCampaigns();
      }
    }
    init();
  }, []);

  const loadLocalCampaigns = () => {
    setLoading(true);
    const localCamps = JSON.parse(localStorage.getItem("campaigns") || "[]");
    const localContacts = JSON.parse(localStorage.getItem("contacts") || "[]");
    
    const processed = localCamps.map((camp: any) => {
      const contacts = localContacts.filter((c: any) => c.campaign_id === camp.id);
      const totalContacts = contacts.length;
      const called = contacts.filter((c: any) => c.status !== "Not Called").length;
      const interested = contacts.filter((c: any) => c.status === "Interested").length;
      const progress = totalContacts ? Math.round((called / totalContacts) * 100) : 0;
      return {
        ...camp,
        totalContacts,
        called,
        interested,
        progress,
      };
    });
    setCampaigns(processed);
    setLoading(false);
  };

  async function loadCampaigns(currentOrgId: string) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select(`
          *,
          contacts(id, status)
        `)
        .eq("organization_id", currentOrgId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        const processed = data.map((camp: any) => {
          const contacts = camp.contacts || [];
          const totalContacts = contacts.length;
          const called = contacts.filter((c: any) => c.status !== "Not Called").length;
          const interested = contacts.filter((c: any) => c.status === "Interested").length;
          const progress = totalContacts ? Math.round((called / totalContacts) * 100) : 0;
          return {
            ...camp,
            totalContacts,
            called,
            interested,
            progress,
          };
        });
        setCampaigns(processed);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  }

  const handleStatusChange = async (campaignId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "active" ? "paused" : "active";
    
    if (isLocalMock()) {
      const localCamps = JSON.parse(localStorage.getItem("campaigns") || "[]");
      const updated = localCamps.map((c: any) => c.id === campaignId ? { ...c, status: nextStatus } : c);
      localStorage.setItem("campaigns", JSON.stringify(updated));
      toast.success(`Campaign status updated to ${nextStatus}`);
      loadLocalCampaigns();
      return;
    }

    try {
      const { error } = await supabase
        .from("campaigns")
        .update({ status: nextStatus })
        .eq("id", campaignId);
      if (error) throw error;
      toast.success(`Campaign status updated to ${nextStatus}`);
      if (orgId) loadCampaigns(orgId);
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const handleCompleteCampaign = async (campaignId: string) => {
    if (isLocalMock()) {
      const localCamps = JSON.parse(localStorage.getItem("campaigns") || "[]");
      const updated = localCamps.map((c: any) => c.id === campaignId ? { ...c, status: "completed" } : c);
      localStorage.setItem("campaigns", JSON.stringify(updated));
      toast.success("Campaign marked as completed");
      loadLocalCampaigns();
      return;
    }

    try {
      const { error } = await supabase
        .from("campaigns")
        .update({ status: "completed" })
        .eq("id", campaignId);
      if (error) throw error;
      toast.success("Campaign marked as completed");
      if (orgId) loadCampaigns(orgId);
    } catch (err: any) {
      toast.error(err.message || "Failed to complete campaign");
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm("Are you sure you want to delete this campaign and all associated contacts?")) return;
    
    if (isLocalMock()) {
      const localCamps = JSON.parse(localStorage.getItem("campaigns") || "[]");
      const localContacts = JSON.parse(localStorage.getItem("contacts") || "[]");
      const updatedCamps = localCamps.filter((c: any) => c.id !== campaignId);
      const updatedContacts = localContacts.filter((c: any) => c.campaign_id !== campaignId);
      localStorage.setItem("campaigns", JSON.stringify(updatedCamps));
      localStorage.setItem("contacts", JSON.stringify(updatedContacts));
      toast.success("Campaign deleted successfully");
      loadLocalCampaigns();
      return;
    }

    try {
      const { error } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", campaignId);
      if (error) throw error;
      toast.success("Campaign deleted successfully");
      if (orgId) loadCampaigns(orgId);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete campaign");
    }
  };

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/);
    if (lines.length < 2) return [];
    
    // Parse headers cleanly
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/['"]/g, ""));
    
    const contacts = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Basic CSV field parser splitting on commas
      const values = line.split(",").map(v => v.trim().replace(/^["']|["']$/g, ""));
      const contact: any = {};
      
      headers.forEach((header, index) => {
        const val = values[index] || "";
        if (header.includes("first") || header === "name") {
          contact.first_name = val;
        } else if (header.includes("last")) {
          contact.last_name = val;
        } else if (header.includes("phone")) {
          contact.phone_number = val;
        } else if (header.includes("email")) {
          contact.email = val;
        } else if (header.includes("location") || header.includes("city")) {
          contact.location = val;
        } else if (header.includes("note")) {
          contact.notes = val;
        }
      });

      // Split name if first_name contains full name
      if (contact.first_name && !contact.last_name) {
        const nameParts = contact.first_name.split(" ");
        if (nameParts.length > 1) {
          contact.first_name = nameParts[0];
          contact.last_name = nameParts.slice(1).join(" ");
        }
      }

      if (contact.first_name || contact.phone_number) {
        contacts.push({
          first_name: contact.first_name || "Unnamed",
          last_name: contact.last_name || "Contact",
          phone_number: contact.phone_number || "",
          email: contact.email || "",
          location: contact.location || "Unknown",
          notes: contact.notes || "",
          status: "Not Called",
        });
      }
    }
    return contacts;
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) {
      toast.error("No active organization found. Try logging out and back in.");
      return;
    }
    if (!campaignName.trim()) {
      toast.error("Please enter a campaign name");
      return;
    }

    setIsSubmitting(true);
    try {
      let contactsToInsert: any[] = [];
      
      // Parse CSV if provided
      if (csvFile) {
        const text = await csvFile.text();
        contactsToInsert = parseCSV(text);
        if (contactsToInsert.length === 0) {
          toast.error("CSV file contains no valid contacts. Headers should include: first_name, last_name, phone_number, location, email.");
          setIsSubmitting(false);
          return;
        }
      } else {
        toast.error("Please upload a CSV document containing contacts to create a list.");
        setIsSubmitting(false);
        return;
      }

      if (isLocalMock()) {
        const localCamps = JSON.parse(localStorage.getItem("campaigns") || "[]");
        const localContacts = JSON.parse(localStorage.getItem("contacts") || "[]");
        
        const newCampId = Date.now().toString();
        const newCamp = {
          id: newCampId,
          name: campaignName.trim(),
          status: "active",
          created_at: new Date().toISOString()
        };
        
        const contactsWithCamp = contactsToInsert.map(c => ({
          ...c,
          id: Math.random().toString(),
          campaign_id: newCampId
        }));
        
        localStorage.setItem("campaigns", JSON.stringify([...localCamps, newCamp]));
        localStorage.setItem("contacts", JSON.stringify([...localContacts, ...contactsWithCamp]));
        
        toast.success(`Campaign "${campaignName}" created with ${contactsToInsert.length} contacts!`);
        setCampaignName("");
        setCsvFile(null);
        setIsDialogOpen(false);
        loadLocalCampaigns();
        return;
      }

      // 1. Create the campaign
      const { data: campaign, error: campaignError } = await supabase
        .from("campaigns")
        .insert({
          name: campaignName.trim(),
          organization_id: orgId,
          status: "active"
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // 2. Insert contacts associated with the campaign
      if (contactsToInsert.length > 0) {
        const finalContacts = contactsToInsert.map(c => ({
          ...c,
          organization_id: orgId,
          campaign_id: campaign.id
        }));

        const { error: contactsError } = await supabase
          .from("contacts")
          .insert(finalContacts);

        if (contactsError) throw contactsError;
      }

      // 3. Log Activity
      await supabase.from("activity_logs").insert({
        organization_id: orgId,
        user_id: userId,
        action: "created",
        entity_type: "campaign",
        entity_id: campaign.id,
        new_value: { name: campaignName, contact_count: contactsToInsert.length }
      });

      toast.success(`Campaign "${campaignName}" created with ${contactsToInsert.length} contacts!`);
      
      // Reset & Reload
      setCampaignName("");
      setCsvFile(null);
      setIsDialogOpen(false);
      loadCampaigns(orgId);
    } catch (err: any) {
      toast.error(err.message || "Failed to create campaign");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Campaigns</h2>
          <p className="text-muted-foreground">Manage your event outreach lists and campaigns.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger render={
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Campaign List
            </Button>
          } />
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create Campaign List</DialogTitle>
              <DialogDescription>
                Create a new campaign list by uploading a contact CSV document.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateCampaign} className="space-y-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="campaignName">Campaign Name</Label>
                <Input
                  id="campaignName"
                  placeholder="e.g. Summer Event 2026"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="csvFile">Upload Contact List (CSV)</Label>
                <div className="flex items-center justify-center border-2 border-dashed rounded-lg p-6 hover:bg-muted/50 cursor-pointer relative">
                  <input
                    id="csvFile"
                    type="file"
                    accept=".csv"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                    required
                  />
                  <div className="text-center space-y-2 pointer-events-none">
                    <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground" />
                    <div className="text-sm font-semibold">
                      {csvFile ? csvFile.name : "Click or drag CSV file here"}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Columns: name, phone_number, location, email, notes
                    </p>
                  </div>
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create & Import List
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-16 text-center space-y-4 bg-card">
          <FileSpreadsheet className="h-16 w-16 text-muted-foreground" />
          <h3 className="text-xl font-bold">No campaigns yet</h3>
          <p className="text-muted-foreground max-w-md">
            Upload a CSV document containing contacts to create your first event campaign list.
          </p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create First Campaign
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="flex flex-col bg-card">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <CardTitle className="text-xl">{campaign.name}</CardTitle>
                  <CardDescription className="mt-1 text-xs">
                    Created {new Date(campaign.created_at).toLocaleDateString()}
                  </CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger className="h-8 w-8 p-0 flex items-center justify-center rounded-md hover:bg-muted">
                    <span className="sr-only">Open menu</span>
                    <MoreVertical className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleStatusChange(campaign.id, campaign.status)}>
                      {campaign.status === "active" ? "Pause campaign" : "Resume campaign"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleCompleteCampaign(campaign.id)}>
                      Mark completed
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteCampaign(campaign.id)}>
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <Badge 
                    variant={
                      campaign.status === "active" ? "default" : 
                      campaign.status === "completed" ? "secondary" : "outline"
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
                  {campaign.status === "paused" && (
                    <Button variant="outline" className="w-full" onClick={() => handleStatusChange(campaign.id, campaign.status)}>
                      <Play className="mr-2 h-4 w-4" /> Resume
                    </Button>
                  )}
                  {campaign.status === "active" && (
                    <Button variant="outline" className="w-full" onClick={() => handleStatusChange(campaign.id, campaign.status)}>
                      <Pause className="mr-2 h-4 w-4" /> Pause
                    </Button>
                  )}
                  {campaign.status !== "completed" && (
                    <Button variant="secondary" className="w-full" onClick={() => handleCompleteCampaign(campaign.id)}>
                      <CheckSquare className="mr-2 h-4 w-4" /> Complete
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
