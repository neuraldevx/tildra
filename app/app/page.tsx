import { HeroSection } from "@/components/landing/hero-section"
// import { HeroScrollDemo } from "@/components/landing/hero-scroll-demo"
import { HowItWorks } from "@/components/landing/how-it-works"
import { Features } from "@/components/landing/features"
import { UseCases } from "@/components/landing/use-cases"
import { ExtensionCallout } from "@/components/landing/extension-callout"
import { Footer } from "@/components/landing/footer"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { Logo } from "@/components/ui/logo"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/50 relative">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-wave-pattern opacity-30 pointer-events-none"></div>

      <header className="container mx-auto px-4 md:px-6 py-8 flex justify-between items-center relative z-[60]">
        <div className="flex-shrink-0 mr-6">
          <Logo size="md" animated={true} />
        </div>
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex gap-6">
            <a
              href="#how-it-works"
              className="text-foreground/80 hover:text-primary transition-all duration-300 
                         hover:scale-105 relative after:absolute after:bottom-0 after:left-0 
                         after:h-0.5 after:w-0 after:bg-primary after:transition-all 
                         hover:after:w-full"
            >
              How It Works
            </a>
            <a
              href="#features"
              className="text-foreground/80 hover:text-primary transition-all duration-300 
                         hover:scale-105 relative after:absolute after:bottom-0 after:left-0 
                         after:h-0.5 after:w-0 after:bg-primary after:transition-all 
                         hover:after:w-full"
            >
              Features
            </a>
            <a
              href="#use-cases"
              className="text-foreground/80 hover:text-primary transition-all duration-300 
                         hover:scale-105 relative after:absolute after:bottom-0 after:left-0 
                         after:h-0.5 after:w-0 after:bg-primary after:transition-all 
                         hover:after:w-full"
            >
              Use Cases
            </a>
          </nav>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <a
              href="/dashboard"
              className="gradient-button px-4 py-2 rounded-lg font-medium hover-lift ripple button-glow"
            >
              Try Now
            </a>
          </div>
        </div>
      </header>

      <main>
        <HeroSection />
        <HowItWorks />
        <Features />
        <UseCases />
        <ExtensionCallout />
      </main>

      <Footer />
    </div>
  )
}
