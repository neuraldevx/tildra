import { Summarizer } from "@/components/dashboard/summarizer"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { Logo } from "@/components/ui/logo"
import Link from "next/link"
import { Sparkles } from "lucide-react"
import { auth } from "@clerk/nextjs/server"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { Library } from "@/components/dashboard/library"
import { TimeSavedAnalytics } from "@/components/dashboard/time-saved-analytics"

// Fetch user status on the server
async function getUserStatusData(userId: string | null, token: string | null) {
  if (!userId || !token) {
    console.log("[Dashboard Server] No user ID or token found on server.");
    return { is_pro: false }; // Not signed in or no token
  }

  try {
    // Use INTERNAL_API_URL which should point directly to the backend service
    // (e.g., http://localhost:8000 locally, or internal service URL in prod)
    // Fallback to localhost:8000 if not set (adjust if your backend runs elsewhere)
    const internalApiBaseUrl = process.env.INTERNAL_API_URL || 'http://127.0.0.1:8000'; 
    const apiUrl = `${internalApiBaseUrl}/api/user/status`;
    
    console.log(`[Dashboard Server] Fetching user status from ${apiUrl} for user ${userId}`);

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json', // Optional: depending on API requirements
      },
      cache: 'no-store', // Ensure fresh data is fetched
    });

    if (!response.ok) {
      // Log detailed error if fetching fails
      const errorBody = await response.text();
      console.error(`[Dashboard Server] API error fetching status (${response.status}): ${errorBody}`);
      throw new Error(`API error fetching status (${response.status}): ${response.statusText}`);
    }

    const data = await response.json();
    console.log("[Dashboard Server] Received user status:", data);
    return data; // e.g., { is_pro: true/false }
  } catch (err) {
    console.error("[Dashboard Server] Failed to fetch user status:", err);
    return { is_pro: false }; // Default to non-pro on error
  }
}

export default async function DashboardPage() {
  // Get user ID and token on the server
  const { userId, getToken } = await auth();
  const token = await getToken();

  // Fetch status for this page load
  const userData = await getUserStatusData(userId, token);
  const isProUser = userData?.is_pro ?? false;

  // Only premium users can access the hub
  if (!isProUser) {
    redirect('/pricing');
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-wave-pattern opacity-10 pointer-events-none"></div>

      <header className="bg-card border-b border-border sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Logo size="sm" animated={true} href="/" />
          <div className="flex items-center gap-4">
            {/* Conditionally render Upgrade link */}
            {!isProUser && (
              <Link
                href="/pricing"
                className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                <Sparkles size={14} className="text-primary" />
                Upgrade to Premium
              </Link>
            )}
            {isProUser && (
              <span className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-green-500">
                <Sparkles size={14} className="text-green-500" /> Premium Access
              </span>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-6">Pro Dashboard</h1>
          {/* Core Summarizer Module */}
          <div className="bg-card p-6 rounded-lg shadow mb-8 transition-opacity duration-300 ease-in-out opacity-100">
            <h2 className="text-xl font-semibold mb-2">Article Summarizer</h2>
            <Summarizer />
          </div>

          {/* Pro Features Grid: Library & Analytics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card p-6 rounded-lg shadow">
              <Library />
            </div>
            <div className="bg-card p-6 rounded-lg shadow">
              <TimeSavedAnalytics />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
