"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { 
  LayoutDashboard, 
  Users, 
  PhoneCall, 
  Calendar, 
  BarChart3, 
  Bell, 
  Menu,
  LogOut,
  Megaphone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Campaigns", href: "/dashboard/campaigns", icon: Megaphone },
  { name: "Contacts", href: "/dashboard/contacts", icon: Users },
  { name: "Follow-Ups", href: "/dashboard/follow-ups", icon: Calendar },
  { name: "Team", href: "/dashboard/team", icon: PhoneCall },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    router.push("/login");
  };

  const NavLinks = () => (
    <>
      <div className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`
                group flex items-center rounded-md px-2 py-2 text-sm font-medium
                ${isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }
              `}
            >
              <item.icon
                className={`mr-3 h-5 w-5 flex-shrink-0 ${
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                }`}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          );
        })}
      </div>
      <div className="border-t p-4 space-y-1">
        <Link
          href="/dashboard/notifications"
          className="group flex items-center rounded-md px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Bell className="mr-3 h-5 w-5 text-muted-foreground group-hover:text-foreground" />
          Notifications
        </Link>

        <button
          onClick={handleLogout}
          className="group flex w-full items-center rounded-md px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <LogOut className="mr-3 h-5 w-5 text-muted-foreground group-hover:text-foreground" />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* Sidebar for desktop */}
      <div className="hidden w-64 flex-col border-r bg-card md:flex">
        <div className="flex h-16 items-center border-b px-4">
          <h1 className="text-xl font-bold text-primary">Mysore Hogona</h1>
        </div>
        <div className="flex flex-1 flex-col overflow-y-auto">
          <NavLinks />
        </div>
      </div>

      {/* Mobile Header */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex h-16 items-center justify-between border-b bg-card px-4 md:hidden">
          <h1 className="text-xl font-bold text-primary">Mysore Hogona</h1>
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-10 w-10">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Open sidebar</span>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="flex h-16 items-center border-b px-4">
                <h1 className="text-xl font-bold text-primary">Mysore Hogona</h1>
              </div>
              <div className="flex h-[calc(100vh-4rem)] flex-col">
                <NavLinks />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
