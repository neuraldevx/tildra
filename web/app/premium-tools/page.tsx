import Link from "next/link"
import { Sparkles } from "lucide-react"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { Logo } from "@/components/ui/logo"

export const metadata = {
  title: "Premium Tools - SnipSummary",
  description: "Access all premium features",
}

export default function PremiumToolsPage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-wave-pattern opacity-10 pointer-events-none" />
      <header className="bg-card border-b border-border sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Logo size="sm" animated={true} href="/" />
          <ThemeToggle />
        </div>
      </header>
      <main className="container mx-auto px-4 py-16 text-center">
        <Sparkles size={48} className="mx-auto text-primary mb-4" />
        <h1 className="text-3xl font-bold mb-2">Welcome to Premium Tools</h1>
        <p className="text-foreground/70 mb-6">
          You now have access to unlimited summaries, advanced AI models, export options, and more!
        </p>
        <Link
          href="/dashboard"
          className="bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium hover:bg-primary/90 transition-colors"
        >
          Go to Dashboard
        </Link>
      </main>
    </div>
  )
} 