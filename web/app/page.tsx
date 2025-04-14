import { HeroSection } from "@/components/landing/hero-section"
import { HowItWorks } from "@/components/landing/how-it-works"
import { Features } from "@/components/landing/features"
import { UseCases } from "@/components/landing/use-cases"
import { ExtensionCallout } from "@/components/landing/extension-callout"
import { Footer } from "@/components/landing/footer"
import { Header } from "@/components/shared/header"

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-muted/50 relative overflow-hidden">
      <div className="absolute inset-0 bg-wave-pattern opacity-30 pointer-events-none"></div>
      <Header />
      <main className="flex-1 overflow-y-auto">
        <HeroSection />
        <HowItWorks />
        <Features />
        <UseCases />
        <ExtensionCallout />
        <Footer />
      </main>
    </div>
  )
}
