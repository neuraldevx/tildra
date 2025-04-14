import { Summarizer } from "@/components/dashboard/summarizer"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { Logo } from "@/components/ui/logo"
import Link from "next/link"
import { Sparkles } from "lucide-react"

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-wave-pattern opacity-10 pointer-events-none"></div>

      <header className="bg-card border-b border-border sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Logo size="sm" animated={true} href="/" />
          <div className="flex items-center gap-4">
            <Link
              href="/pricing"
              className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <Sparkles size={14} className="text-primary" />
              Upgrade to Premium
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-foreground">Article Summarizer</h1>
            <Link
              href="/pricing"
              className="sm:hidden flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <Sparkles size={14} className="text-primary" />
              Upgrade
            </Link>
          </div>
          <Summarizer />
        </div>
      </main>
    </div>
  )
}
