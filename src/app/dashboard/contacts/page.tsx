"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  flexRender, 
  getCoreRowModel, 
  useReactTable, 
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  ColumnDef
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Upload, UserPlus, Filter, Download, Loader2, FileSpreadsheet, Trash2, Users, RefreshCw, Calendar } from "lucide-react";
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
import { Label } from "@/components/ui/label";

type Contact = {
  id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  email: string;
  location: string;
  status: string;
  callback_time: string | null;
  notes: string;
  campaign_id: string | null;
  assigned_member_id: string | null;
  created_at: string;
  campaignName?: string;
  assignedMemberName?: string;
};

// Define Columns static outside the component to prevent re-initialization rendering loops
const columns: ColumnDef<Contact>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() as any && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <div className="font-medium">
        {row.original.first_name} {row.original.last_name}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status / Log Call",
    cell: ({ row, table }) => {
      const contact = row.original;
      const meta = table.options.meta as any;
      return (
        <select
          value={contact.status}
          onChange={(e) => {
            const val = e.target.value;
            if (val === "Callback Scheduled") {
              meta?.openCallbackDialog(contact);
            } else {
              meta?.updateStatus(contact.id, val);
            }
          }}
          className="flex h-8 w-fit rounded-md border border-input bg-card px-2 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-medium"
        >
          <option value="Not Called">Not Called</option>
          <option value="Busy">Busy</option>
          <option value="Interested">Interested</option>
          <option value="Not Interested">Not Interested</option>
          <option value="Callback Scheduled">Callback Scheduled</option>
        </select>
      );
    },
  },
  {
    accessorKey: "phone_number",
    header: "Phone",
  },
  {
    accessorKey: "location",
    header: "Location",
  },
  {
    accessorKey: "callback_time",
    header: "Next Call Time",
    cell: ({ row }) => {
      const time = row.original.callback_time;
      if (!time) return <span className="text-muted-foreground text-xs">Not Scheduled</span>;
      return (
        <Badge variant="outline" className="flex items-center gap-1 w-fit bg-primary/5 text-primary text-xs font-semibold px-2 py-0.5 border-primary/20">
          <Calendar className="h-3 w-3" />
          {new Date(time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
        </Badge>
      );
    },
  },
  {
    accessorKey: "campaignName",
    header: "Campaign List",
  },
  {
    accessorKey: "assignedMemberName",
    header: "Assigned To",
  },
  {
    id: "actions",
    cell: ({ row, table }) => {
      const contact = row.original;
      const meta = table.options.meta as any;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger className="h-8 w-8 p-0 flex items-center justify-center rounded-md hover:bg-muted">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(contact.phone_number)}>
              Copy phone number
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => meta?.openReassign(contact)}>
              Reassign Lead
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => meta?.openCallbackDialog(contact)}>
              Schedule Callback Time
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600" onClick={() => meta?.deleteContact(contact.id)}>
              Delete Contact
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export default function ContactsPage() {
  const supabase = createClient();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Sorting, selection, filtering state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");
  
  // Custom filters
  const [statusFilter, setStatusFilter] = useState("All");
  const [campaignFilter, setCampaignFilter] = useState("All");

  // Modals state
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isImportCSVOpen, setIsImportCSVOpen] = useState(false);
  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [selectedContactForAssign, setSelectedContactForAssign] = useState<Contact | null>(null);
  
  // Callback scheduling state
  const [isCallbackDialogOpen, setIsCallbackDialogOpen] = useState(false);
  const [callbackDateTime, setCallbackDateTime] = useState("");
  const [contactToSchedule, setContactToSchedule] = useState<Contact | null>(null);

  // Form states - Add Contact
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [newCallbackTime, setNewCallbackTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states - CSV Import
  const [importCampaignId, setImportCampaignId] = useState("");
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
          loadLocalData();
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
          await loadData(currentOrgId);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        setOrgId("mock-org-id");
        setUserId("mock-user-id");
        loadLocalData();
      }
    }
    init();
  }, []);

  const loadLocalData = () => {
    setLoading(true);
    const localCamps = JSON.parse(localStorage.getItem("campaigns") || "[]");
    setCampaigns(localCamps);

    const localTeam = JSON.parse(localStorage.getItem("teamMembers") || "[]");
    setTeamMembers(localTeam.map((t: any) => ({
      memberId: t.id,
      name: t.name
    })));

    const localContacts = JSON.parse(localStorage.getItem("contacts") || "[]");
    const formatted = localContacts.map((c: any) => {
      const camp = localCamps.find((ca: any) => ca.id === c.campaign_id);
      const team = localTeam.find((te: any) => te.id === c.assigned_member_id);
      return {
        id: c.id,
        first_name: c.first_name,
        last_name: c.last_name,
        phone_number: c.phone_number,
        email: c.email,
        location: c.location,
        status: c.status,
        callback_time: c.callback_time,
        notes: c.notes,
        campaign_id: c.campaign_id,
        assigned_member_id: c.assigned_member_id,
        created_at: c.created_at || new Date().toISOString(),
        campaignName: camp ? camp.name : "No Campaign",
        assignedMemberName: team ? team.name : "Unassigned"
      };
    });
    setContacts(formatted);
    setLoading(false);
  };

  async function loadData(currentOrgId: string) {
    setLoading(true);
    try {
      // 1. Fetch campaigns for dropdowns
      const { data: campaignsData } = await supabase
        .from("campaigns")
        .select("*")
        .eq("organization_id", currentOrgId);
      if (campaignsData) setCampaigns(campaignsData);

      // 2. Fetch organization members / team members
      const { data: teamData } = await supabase
        .from("organization_members")
        .select(`
          id,
          profiles(id, first_name, last_name)
        `)
        .eq("organization_id", currentOrgId);
      
      if (teamData) {
        setTeamMembers(teamData.map((t: any) => ({
          memberId: t.id,
          name: `${t.profiles?.first_name || ""} ${t.profiles?.last_name || ""}`.trim() || "Unknown Member"
        })));
      }

      // 3. Fetch contacts
      const { data: contactsData, error } = await supabase
        .from("contacts")
        .select(`
          *,
          campaigns(name),
          organization_members(profiles(first_name, last_name))
        `)
        .eq("organization_id", currentOrgId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (contactsData) {
        const formatted = contactsData.map((c: any) => {
          const assignedProf = c.organization_members?.profiles;
          return {
            id: c.id,
            first_name: c.first_name,
            last_name: c.last_name,
            phone_number: c.phone_number,
            email: c.email,
            location: c.location,
            status: c.status,
            callback_time: c.callback_time,
            notes: c.notes,
            campaign_id: c.campaign_id,
            assigned_member_id: c.assigned_member_id,
            created_at: c.created_at,
            campaignName: c.campaigns?.name || "No Campaign",
            assignedMemberName: assignedProf ? `${assignedProf.first_name || ""} ${assignedProf.last_name || ""}`.trim() : "Unassigned"
          };
        });
        setContacts(formatted);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load contacts data");
    } finally {
      setLoading(false);
    }
  }

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;

    setIsSubmitting(true);
    try {
      const callbackISO = newCallbackTime ? new Date(newCallbackTime).toISOString() : null;
      const newContactObj = {
        first_name: newFirstName.trim(),
        last_name: newLastName.trim(),
        phone_number: newPhone.trim(),
        email: newEmail.trim(),
        location: newLocation.trim(),
        notes: newNotes.trim(),
        campaign_id: selectedCampaignId || null,
        assigned_member_id: selectedMemberId || null,
        status: callbackISO ? "Callback Scheduled" : "Not Called",
        callback_time: callbackISO
      };

      if (isLocalMock()) {
        const localContacts = JSON.parse(localStorage.getItem("contacts") || "[]");
        const newContact = { ...newContactObj, id: Date.now().toString(), created_at: new Date().toISOString() };
        localStorage.setItem("contacts", JSON.stringify([...localContacts, newContact]));
        
        if (callbackISO) {
          const localFollowups = JSON.parse(localStorage.getItem("followUps") || "[]");
          localFollowups.push({
            id: Date.now().toString(),
            organization_id: orgId,
            contact_id: newContact.id,
            due_date: callbackISO,
            status: "pending",
            notes: "Manually scheduled callback"
          });
          localStorage.setItem("followUps", JSON.stringify(localFollowups));
        }

        toast.success("Contact added successfully");
        
        setNewFirstName("");
        setNewLastName("");
        setNewPhone("");
        setNewEmail("");
        setNewLocation("");
        setNewNotes("");
        setSelectedCampaignId("");
        setSelectedMemberId("");
        setNewCallbackTime("");
        setIsAddContactOpen(false);
        loadLocalData();
        return;
      }

      const { data: contact, error } = await supabase
        .from("contacts")
        .insert({
          ...newContactObj,
          organization_id: orgId,
        })
        .select()
        .single();

      if (error) throw error;

      if (callbackISO && contact) {
        await supabase.from("follow_ups").insert({
          organization_id: orgId,
          contact_id: contact.id,
          due_date: callbackISO,
          status: "pending",
          notes: "Manually scheduled callback"
        });
      }

      toast.success("Contact added successfully");
      setNewFirstName("");
      setNewLastName("");
      setNewPhone("");
      setNewEmail("");
      setNewLocation("");
      setNewNotes("");
      setSelectedCampaignId("");
      setSelectedMemberId("");
      setNewCallbackTime("");
      setIsAddContactOpen(false);
      loadData(orgId);
    } catch (err: any) {
      toast.error(err.message || "Failed to create contact");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (contactId: string, status: string) => {
    if (!orgId) return;

    if (isLocalMock()) {
      const localContacts = JSON.parse(localStorage.getItem("contacts") || "[]");
      const updated = localContacts.map((c: any) => {
        if (c.id === contactId) {
          const cleanCallback = status === "Callback Scheduled" ? c.callback_time : null;
          return { ...c, status, callback_time: cleanCallback };
        }
        return c;
      });
      localStorage.setItem("contacts", JSON.stringify(updated));
      toast.success(`Contact status updated to "${status}"`);
      loadLocalData();
      return;
    }

    try {
      const cleanCallback = status === "Callback Scheduled" ? undefined : null;
      const { error } = await supabase
        .from("contacts")
        .update({ status, callback_time: cleanCallback })
        .eq("id", contactId);

      if (error) throw error;
      toast.success(`Contact status updated to "${status}"`);
      
      // Log activity
      await supabase.from("activity_logs").insert({
        organization_id: orgId,
        user_id: userId,
        action: "updated_status",
        entity_type: "contact",
        entity_id: contactId,
        new_value: { status }
      });

      loadData(orgId);
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const handleOpenCallbackDialog = (contact: Contact) => {
    setContactToSchedule(contact);
    setCallbackDateTime("");
    setIsCallbackDialogOpen(true);
  };

  const handleSaveCallbackTime = async () => {
    if (!contactToSchedule || !callbackDateTime) {
      toast.error("Please select a date and time");
      return;
    }

    const timeISO = new Date(callbackDateTime).toISOString();

    if (isLocalMock()) {
      const localContacts = JSON.parse(localStorage.getItem("contacts") || "[]");
      const updated = localContacts.map((c: any) => 
        c.id === contactToSchedule.id 
          ? { ...c, status: "Callback Scheduled", callback_time: timeISO } 
          : c
      );
      localStorage.setItem("contacts", JSON.stringify(updated));
      
      const localFollowups = JSON.parse(localStorage.getItem("followUps") || "[]");
      localFollowups.push({
        id: Date.now().toString(),
        organization_id: orgId,
        contact_id: contactToSchedule.id,
        due_date: timeISO,
        status: "pending",
        notes: "Scheduled callback call"
      });
      localStorage.setItem("followUps", JSON.stringify(localFollowups));

      toast.success("Callback scheduled successfully");
      setIsCallbackDialogOpen(false);
      setContactToSchedule(null);
      loadLocalData();
      return;
    }

    try {
      const { error: err1 } = await supabase
        .from("contacts")
        .update({ status: "Callback Scheduled", callback_time: timeISO })
        .eq("id", contactToSchedule.id);

      if (err1) throw err1;

      const { error: err2 } = await supabase
        .from("follow_ups")
        .insert({
          organization_id: orgId,
          contact_id: contactToSchedule.id,
          due_date: timeISO,
          status: "pending",
          notes: "Scheduled callback call"
        });

      if (err2) throw err2;

      toast.success("Callback scheduled successfully");
      setIsCallbackDialogOpen(false);
      setContactToSchedule(null);
      if (orgId) loadData(orgId);
    } catch (err: any) {
      toast.error(err.message || "Failed to schedule callback");
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!orgId) return;
    if (!confirm("Are you sure you want to delete this contact?")) return;

    if (isLocalMock()) {
      const localContacts = JSON.parse(localStorage.getItem("contacts") || "[]");
      const updated = localContacts.filter((c: any) => c.id !== contactId);
      localStorage.setItem("contacts", JSON.stringify(updated));
      toast.success("Contact deleted successfully");
      loadLocalData();
      return;
    }

    try {
      const { error } = await supabase
        .from("contacts")
        .delete()
        .eq("id", contactId);

      if (error) throw error;
      toast.success("Contact deleted successfully");
      loadData(orgId);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete contact");
    }
  };

  const handleAssignMember = async (memberId: string) => {
    if (!orgId || !selectedContactForAssign) return;

    if (isLocalMock()) {
      const localContacts = JSON.parse(localStorage.getItem("contacts") || "[]");
      const updated = localContacts.map((c: any) => c.id === selectedContactForAssign.id ? { ...c, assigned_member_id: memberId || null } : c);
      localStorage.setItem("contacts", JSON.stringify(updated));
      toast.success("Lead reassigned successfully");
      setIsReassignOpen(false);
      setSelectedContactForAssign(null);
      loadLocalData();
      return;
    }

    try {
      const { error } = await supabase
        .from("contacts")
        .update({ assigned_member_id: memberId || null })
        .eq("id", selectedContactForAssign.id);

      if (error) throw error;
      toast.success("Lead reassigned successfully");
      setIsReassignOpen(false);
      setSelectedContactForAssign(null);
      loadData(orgId);
    } catch (err: any) {
      toast.error(err.message || "Failed to reassign contact");
    }
  };

  const handleExportContacts = () => {
    if (contacts.length === 0) {
      toast.error("No contacts to export");
      return;
    }
    const headers = ["First Name", "Last Name", "Phone Number", "Email", "Location", "Status", "Callback Time", "Notes", "Campaign", "Assigned To"];
    const rows = contacts.map(c => [
      c.first_name || "",
      c.last_name || "",
      c.phone_number || "",
      c.email || "",
      c.location || "",
      c.status || "",
      c.callback_time ? new Date(c.callback_time).toLocaleString() : "Not Scheduled",
      c.notes || "",
      c.campaignName || "No Campaign",
      c.assignedMemberName || "Unassigned"
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "mysore_hogona_contacts.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Contacts exported to CSV successfully!");
  };

  const handleRebalanceAssignments = async () => {
    if (contacts.length === 0) {
      toast.error("No contacts available to distribute");
      return;
    }
    if (teamMembers.length === 0) {
      toast.error("No team members found to balance assignments");
      return;
    }

    if (!confirm(`Rebalance ${contacts.length} contacts evenly among ${teamMembers.length} team members?`)) return;

    if (isLocalMock()) {
      const localContacts = JSON.parse(localStorage.getItem("contacts") || "[]");
      const updated = localContacts.map((c: any, index: number) => {
        const member = teamMembers[index % teamMembers.length];
        return { ...c, assigned_member_id: member.memberId };
      });
      localStorage.setItem("contacts", JSON.stringify(updated));
      toast.success("Contacts balanced evenly among team members!");
      loadLocalData();
      return;
    }

    try {
      setLoading(true);
      for (let i = 0; i < contacts.length; i++) {
        const contact = contacts[i];
        const member = teamMembers[i % teamMembers.length];
        await supabase
          .from("contacts")
          .update({ assigned_member_id: member.memberId })
          .eq("id", contact.id);
      }
      toast.success("Contacts balanced evenly among team members!");
      if (orgId) loadData(orgId);
    } catch (err: any) {
      toast.error(err.message || "Failed to rebalance contacts");
      setLoading(false);
    }
  };

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/);
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/['"]/g, ""));
    const list = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
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

      if (contact.first_name && !contact.last_name) {
        const nameParts = contact.first_name.split(" ");
        if (nameParts.length > 1) {
          contact.first_name = nameParts[0];
          contact.last_name = nameParts.slice(1).join(" ");
        }
      }

      if (contact.first_name || contact.phone_number) {
        list.push({
          first_name: contact.first_name || "Unnamed",
          last_name: contact.last_name || "Contact",
          phone_number: contact.phone_number || "",
          email: contact.email || "",
          location: contact.location || "Unknown",
          notes: contact.notes || "",
          status: "Not Called"
        });
      }
    }
    return list;
  };

  const handleImportCSV = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;
    if (!csvFile) {
      toast.error("Please select a CSV file");
      return;
    }
    if (!importCampaignId) {
      toast.error("Please select a campaign for the imported list");
      return;
    }

    setIsSubmitting(true);
    try {
      const text = await csvFile.text();
      const parsed = parseCSV(text);

      if (parsed.length === 0) {
        toast.error("CSV contains no valid contacts");
        setIsSubmitting(false);
        return;
      }

      if (isLocalMock()) {
        const localContacts = JSON.parse(localStorage.getItem("contacts") || "[]");
        const finalContacts = parsed.map(c => ({
          ...c,
          id: Math.random().toString(),
          campaign_id: importCampaignId,
          created_at: new Date().toISOString()
        }));
        localStorage.setItem("contacts", JSON.stringify([...localContacts, ...finalContacts]));
        toast.success(`Imported ${finalContacts.length} contacts successfully!`);
        
        setCsvFile(null);
        setImportCampaignId("");
        setIsImportCSVOpen(false);
        loadLocalData();
        return;
      }

      const finalContacts = parsed.map(c => ({
        ...c,
        organization_id: orgId,
        campaign_id: importCampaignId
      }));

      const { error } = await supabase
        .from("contacts")
        .insert(finalContacts);

      if (error) throw error;

      toast.success(`Imported ${finalContacts.length} contacts successfully!`);
      
      setCsvFile(null);
      setImportCampaignId("");
      setIsImportCSVOpen(false);
      loadData(orgId);
    } catch (err: any) {
      toast.error(err.message || "Failed to import CSV");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter contacts locally based on custom filters
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const matchesStatus = statusFilter === "All" || c.status === statusFilter;
      const matchesCampaign = campaignFilter === "All" || c.campaign_id === campaignFilter;
      return matchesStatus && matchesCampaign;
    });
  }, [contacts, statusFilter, campaignFilter]);

  const tableMeta = useMemo(() => ({
    updateStatus: handleUpdateStatus,
    openCallbackDialog: handleOpenCallbackDialog,
    openReassign: (contact: Contact) => {
      setSelectedContactForAssign(contact);
      setIsReassignOpen(true);
    },
    deleteContact: handleDeleteContact,
  }), [orgId, userId, teamMembers]);

  const table = useReactTable({
    data: filteredContacts,
    columns,
    meta: tableMeta,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      rowSelection,
      globalFilter,
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Contacts</h2>
          <p className="text-muted-foreground">Manage your outreach contacts database dynamically.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRebalanceAssignments}>
            <RefreshCw className="mr-2 h-4 w-4" /> Rebalance Assignments
          </Button>
          <Button variant="outline" onClick={handleExportContacts}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>

          {/* Import CSV Modal */}
          <Dialog open={isImportCSVOpen} onOpenChange={setIsImportCSVOpen}>
            <DialogTrigger render={
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" /> Import CSV
              </Button>
            } />
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Import Contacts CSV</DialogTitle>
                <DialogDescription>
                  Choose a Campaign List to assign these contacts to and upload your file.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleImportCSV} className="space-y-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="importCampaign">Campaign List</Label>
                  <select
                    id="importCampaign"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={importCampaignId}
                    onChange={(e) => setImportCampaignId(e.target.value)}
                    required
                  >
                    <option value="">-- Select Campaign --</option>
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="importCsvFile">Upload Contact List (CSV)</Label>
                  <div className="flex items-center justify-center border-2 border-dashed rounded-lg p-6 hover:bg-muted/50 cursor-pointer relative">
                    <input
                      id="importCsvFile"
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
                    Import CSV Contacts
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Add Contact Modal */}
          <Dialog open={isAddContactOpen} onOpenChange={setIsAddContactOpen}>
            <DialogTrigger render={
              <Button>
                <UserPlus className="mr-2 h-4 w-4" /> Add Contact
              </Button>
            } />
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add Contact</DialogTitle>
                <DialogDescription>
                  Manually create a new outreach contact in the database.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateContact} className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={newFirstName}
                      onChange={(e) => setNewFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={newLastName}
                      onChange={(e) => setNewLastName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    placeholder="e.g. +91 98765 43210"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="e.g. name@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="e.g. Mysore, IN"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="campaign">Campaign List</Label>
                    <select
                      id="campaign"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={selectedCampaignId}
                      onChange={(e) => setSelectedCampaignId(e.target.value)}
                    >
                      <option value="">-- None --</option>
                      {campaigns.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="assignee">Assign Team Member</Label>
                    <select
                      id="assignee"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={selectedMemberId}
                      onChange={(e) => setSelectedMemberId(e.target.value)}
                    >
                      <option value="">-- Unassigned --</option>
                      {teamMembers.map((t) => (
                        <option key={t.memberId} value={t.memberId}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="newCallback">Schedule Next Call (Optional)</Label>
                  <Input
                    id="newCallback"
                    type="datetime-local"
                    value={newCallbackTime}
                    onChange={(e) => setNewCallbackTime(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    placeholder="Outreach comments..."
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                  />
                </div>
                <DialogFooter className="pt-2">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Contact
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Callback Scheduling Dialog */}
      <Dialog open={isCallbackDialogOpen} onOpenChange={setIsCallbackDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Schedule Callback Time</DialogTitle>
            <DialogDescription>
              Set the date and time when {contactToSchedule?.first_name} {contactToSchedule?.last_name} should be called next.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="callbackTime">Next Call Date & Time</Label>
              <Input
                id="callbackTime"
                type="datetime-local"
                value={callbackDateTime}
                onChange={(e) => setCallbackDateTime(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCallbackDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCallbackTime}>
              Schedule Call
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassign Lead Dialog */}
      <Dialog open={isReassignOpen} onOpenChange={setIsReassignOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Reassign Lead</DialogTitle>
            <DialogDescription>
              Select a team member to assign this lead to.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start text-red-500 hover:text-red-600"
              onClick={() => handleAssignMember("")}
            >
              Unassign Contact
            </Button>
            {teamMembers.map((member) => (
              <Button
                key={member.memberId}
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleAssignMember(member.memberId)}
              >
                {member.name}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-muted/30 p-3 rounded-lg border border-border/60">
        <Input
          placeholder="Search contacts..."
          value={globalFilter ?? ""}
          onChange={(event) => setGlobalFilter(String(event.target.value))}
          className="max-w-sm bg-card"
        />
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-semibold">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-card px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-medium"
            >
              <option value="All">All Statuses</option>
              <option value="Not Called">Not Called</option>
              <option value="Busy">Busy</option>
              <option value="Interested">Interested</option>
              <option value="Not Interested">Not Interested</option>
              <option value="Callback Scheduled">Callback Scheduled</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-semibold">Campaign:</span>
            <select
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-card px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-medium"
            >
              <option value="All">All Campaigns</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-16 text-center space-y-4 bg-card">
          <Users className="h-16 w-16 text-muted-foreground" />
          <h3 className="text-xl font-bold">No contacts found</h3>
          <p className="text-muted-foreground max-w-md">
            No contacts match the current search or filters. Create a new campaign list or adjust your filters.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsImportCSVOpen(true)}>
              <Upload className="mr-2 h-4 w-4" /> Import CSV
            </Button>
            <Button onClick={() => setIsAddContactOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" /> Add Contact
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-md border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
      {!loading && filteredContacts.length > 0 && (
        <div className="flex items-center justify-end space-x-2">
          <div className="flex-1 text-sm text-muted-foreground">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
