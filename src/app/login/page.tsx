"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const TEAM_MEMBERS = ["Harshith", "Abhinav", "Ganesh", "Kushaal", "Arnav", "Aadith"];

export default function LoginPage() {
  const [selectedName, setSelectedName] = useState(TEAM_MEMBERS[0]);
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Password validation (must be name in all CAPITAL letters)
    const expectedPassword = selectedName.toUpperCase();
    if (password !== expectedPassword) {
      toast.error(`Invalid password. Password must be your name in all CAPITAL letters (i.e. "${expectedPassword}")`);
      return;
    }

    setIsLoading(true);
    const email = `${selectedName.toLowerCase()}@mysorehogona.com`;

    const isDummySupabase =
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes("dummy") ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "dummy_anon_key";

    // Setup fallback logic
    const executeFallback = () => {
      document.cookie = "sb-mock-session=true; path=/; max-age=86400";
      localStorage.setItem("mock_user", JSON.stringify({
        id: selectedName.toLowerCase(),
        email,
        first_name: selectedName,
        last_name: "",
        is_mock: true
      }));
      toast.success(`Logged in as ${selectedName} (Demo Mode)`);
      router.push("/dashboard");
      router.refresh();
    };

    if (isDummySupabase) {
      executeFallback();
      setIsLoading(false);
      return;
    }

    try {
      // 2. Attempt login
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        // 3. If user doesn't exist yet, automatically register them
        if (signInError.message.toLowerCase().includes("invalid login credentials") ||
          signInError.message.toLowerCase().includes("user not found") ||
          signInError.message.toLowerCase().includes("email not confirmed")) {

          toast.info(`Initializing account for ${selectedName}...`);

          const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                first_name: selectedName,
                last_name: "",
              },
            },
          });

          if (signUpError) {
            console.error("Signup failed, falling back to Local Storage mode", signUpError);
            executeFallback();
            return;
          }

          // Try logging in again after signup
          const { error: retryError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (retryError) {
            console.error("Retry login failed, falling back to Local Storage mode", retryError);
            executeFallback();
            return;
          }
        } else {
          // If it's a network error or configuration error, fall back to mock session
          console.error("Supabase login error, falling back to Local Storage mode", signInError);
          executeFallback();
          return;
        }
      }

      toast.success(`Welcome back, ${selectedName}!`);
      // Delete mock session cookie so real Supabase session is preferred
      document.cookie = "sb-mock-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
      router.push("/dashboard");
      router.refresh();
    } catch (error: any) {
      console.error("Catch login error, falling back to Local Storage mode", error);
      executeFallback();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md bg-card">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Mysore Hogona</CardTitle>
          <CardDescription>
            Select your name and enter your password to sign in
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="memberName">Choose your name</Label>
              <select
                id="memberName"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={selectedName}
                onChange={(e) => setSelectedName(e.target.value)}
              >
                {TEAM_MEMBERS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password (Your name in ALL CAPS)</Label>
              <Input
                id="password"
                type="password"
                required
                placeholder="e.g. HARSHITH"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col pt-2">
            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
