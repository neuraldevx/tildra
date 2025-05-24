import { HeroSection } from "@/components/landing/hero-section"
// import { HowItWorks } from "@/components/landing/how-it-works"; // Commented out
import { Features } from "@/components/landing/features"
import { AboutSection } from "@/components/landing/about-section"
import { WhyChooseSection } from "@/components/landing/why-choose-section"
import { FaqSection } from "@/components/landing/faq-section"
// import { CtaSection } from "@/components/landing/cta-section"; // Commented out
import { ExtensionCallout } from "@/components/landing/extension-callout"

import { SocialProof } from "@/components/landing/social-proof"
import { FinalCTA } from "@/components/landing/final-cta"
import { Footer } from "@/components/landing/footer"

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-muted/50 relative overflow-hidden">
      <div className="absolute inset-0 bg-wave-pattern opacity-30 pointer-events-none"></div>
      <main className="flex-1 overflow-y-auto">
        <HeroSection />
        {/* <HowItWorks /> */ /* Commented out */}
        <Features />
        <SocialProof />
        <ExtensionCallout />
        <AboutSection />
        <WhyChooseSection />
        <FaqSection />
        {/* <CtaSection /> */ /* Commented out */}
        <FinalCTA />
        <Footer />
      </main>
    </div>
  )
}
