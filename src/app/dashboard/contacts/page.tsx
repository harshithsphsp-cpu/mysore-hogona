"use client";

import { useState } from "react";
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
import { MoreHorizontal, Upload, UserPlus, Filter, Download } from "lucide-react";

type Contact = {
  id: string;
  name: string;
  phoneNumber: string;
  email: string;
  location: string;
  status: string;
  callbackTime: string | null;
  notes: string;
  assignedMember: string;
  lastUpdated: string;
  called: boolean;
};

const data: Contact[] = [
  {
    id: "1",
    name: "John Doe",
    phoneNumber: "+91 98765 43210",
    email: "john@example.com",
    location: "Mysore, IN",
    status: "Interested",
    callbackTime: "2026-06-05T10:00:00Z",
    notes: "Wants to visit Mysore Palace, needs event details",
    assignedMember: "Harshith",
    lastUpdated: "2026-06-02T10:00:00Z",
    called: true,
  },
  {
    id: "2",
    name: "Jane Smith",
    phoneNumber: "+91 87654 32109",
    email: "jane@example.com",
    location: "Bangalore, IN",
    status: "Not Called",
    callbackTime: null,
    notes: "",
    assignedMember: "Abhinav",
    lastUpdated: "2026-06-01T10:00:00Z",
    called: false,
  },
  {
    id: "3",
    name: "Robert Johnson",
    phoneNumber: "+91 76543 21098",
    email: "robert@example.com",
    location: "Mandya, IN",
    status: "Callback Scheduled",
    callbackTime: "2026-06-03T14:00:00Z",
    notes: "Follow up after the weekend to confirm tickets",
    assignedMember: "Ganesh",
    lastUpdated: "2026-06-02T11:00:00Z",
    called: true,
  },
  {
    id: "4",
    name: "Emily Davis",
    phoneNumber: "+91 65432 10987",
    email: "emily@example.com",
    location: "Ooty, IN",
    status: "Not Called",
    callbackTime: null,
    notes: "",
    assignedMember: "Kushaal",
    lastUpdated: "2026-06-02T12:00:00Z",
    called: false,
  },
  {
    id: "5",
    name: "Michael Brown",
    phoneNumber: "+91 54321 09876",
    email: "michael@example.com",
    location: "Coorg, IN",
    status: "Interested",
    callbackTime: "2026-06-04T09:00:00Z",
    notes: "Send the registration details for the Mysore tour package",
    assignedMember: "Arnav",
    lastUpdated: "2026-06-02T13:00:00Z",
    called: true,
  },
  {
    id: "6",
    name: "Sarah Wilson",
    phoneNumber: "+91 43210 98765",
    email: "sarah@example.com",
    location: "Chamarajanagar, IN",
    status: "Busy",
    callbackTime: "2026-06-02T16:00:00Z",
    notes: "Call back in the evening",
    assignedMember: "Aadith",
    lastUpdated: "2026-06-02T14:00:00Z",
    called: true,
  },
];

export const columns: ColumnDef<Contact>[] = [
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
    cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const getStatusColor = (status: string) => {
        switch (status) {
          case "Interested": return "bg-green-500/10 text-green-500 hover:bg-green-500/20";
          case "Not Interested": return "bg-red-500/10 text-red-500 hover:bg-red-500/20";
          case "Callback Scheduled": return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20";
          case "Not Called": return "bg-slate-500/10 text-slate-500 hover:bg-slate-500/20";
          default: return "bg-primary/10 text-primary hover:bg-primary/20";
        }
      };
      return <Badge variant="outline" className={getStatusColor(status)}>{status}</Badge>;
    },
  },
  {
    accessorKey: "phoneNumber",
    header: "Phone",
  },
  {
    accessorKey: "location",
    header: "Location",
  },
  {
    accessorKey: "assignedMember",
    header: "Assigned To",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const contact = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger className="h-8 w-8 p-0 flex items-center justify-center rounded-md hover:bg-muted">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(contact.phoneNumber)}>
              Copy phone number
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>View details</DropdownMenuItem>
            <DropdownMenuItem>Log call</DropdownMenuItem>
            <DropdownMenuItem>Reassign</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export default function ContactsPage() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns,
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
          <p className="text-muted-foreground">Manage your outreach contacts and their statuses.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" /> Import CSV
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          <Button>
            <UserPlus className="mr-2 h-4 w-4" /> Add Contact
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Input
          placeholder="Search contacts..."
          value={globalFilter ?? ""}
          onChange={(event) => setGlobalFilter(String(event.target.value))}
          className="max-w-sm"
        />
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      <div className="rounded-md border bg-card">
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
    </div>
  );
}
