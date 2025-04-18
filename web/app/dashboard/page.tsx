import { Summarizer } from "@/components/dashboard/summarizer"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { Logo } from "@/components/ui/logo"
import Link from "next/link"
import { Sparkles } from "lucide-react"

// **Placeholder:** Fetch user status (replace with actual data fetching)
// In a real app, this would come from context, props, or a hook.
async function getUserStatusData() {
  // Simulate fetching: Replace with your actual logic 
  console.log("[Dashboard] Fetching user status (placeholder)");
  // const response = await fetch('/api/user/status');
  // const data = await response.json();
  // return data; // e.g., { is_pro: true/false }
  return { is_pro: false }; // Default to free for example
  // return { is_pro: true }; // Use this to test pro view
}

export default async function DashboardPage() {
  // Fetch status for this page load
  const userData = await getUserStatusData();
  const isProUser = userData.is_pro;

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
            {/* Optionally show something for Pro users? 
            {isProUser && (
              <span className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                 <Sparkles size={14} className="text-green-500" /> Pro Plan
              </span>
            )} 
            */}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-foreground">Article Summarizer</h1>
            {/* Conditionally render mobile Upgrade link */}
            {!isProUser && (
              <Link
                href="/pricing"
                className="sm:hidden flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                <Sparkles size={14} className="text-primary" />
                Upgrade
              </Link>
            )}
          </div>
          <Summarizer />
        </div>
      </main>
    </div>
  )
}
