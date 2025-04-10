import { Logo } from "@/components/ui/logo"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import Link from "next/link"

export const metadata = {
  title: "Terms of Service - Tildra",
  description: "Read the terms and conditions for using Tildra's services",
}

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-wave-pattern opacity-10 pointer-events-none"></div>

      <header className="bg-card border-b border-border sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Logo size="sm" animated={true} href="/" />
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 relative z-10">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-foreground">Terms of Service</h1>

          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p className="text-foreground/70">Last Updated: April 9, 2025</p>

            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing or using Tildra's website and services, you agree to be bound by these Terms of Service. If
              you do not agree to these terms, please do not use our services.
            </p>

            <h2>2. Description of Service</h2>
            <p>
              Tildra provides an AI-powered article summarization service that generates concise summaries and key
              points from longer texts. Our service is designed to help users quickly understand the essence of articles
              without reading the entire content.
            </p>

            <h2>3. User Accounts</h2>
            <p>
              Some features of our service may require you to create an account. You are responsible for maintaining the
              confidentiality of your account information and for all activities that occur under your account. You
              agree to notify us immediately of any unauthorized use of your account.
            </p>

            <h2>4. User Content</h2>
            <p>
              When you submit content to our service for summarization, you retain ownership of that content. However,
              you grant us a non-exclusive, worldwide, royalty-free license to use, store, and process the content
              solely for the purpose of providing our services to you.
            </p>

            <h2>5. Prohibited Uses</h2>
            <p>
              You agree not to use our services for any unlawful purpose or in any way that could damage, disable,
              overburden, or impair our services. Prohibited activities include but are not limited to:
            </p>
            <ul>
              <li>Violating any applicable laws or regulations</li>
              <li>Infringing upon the intellectual property rights of others</li>
              <li>Attempting to gain unauthorized access to our systems or user accounts</li>
              <li>Using our services to distribute malware or other harmful content</li>
              <li>Engaging in any activity that interferes with or disrupts our services</li>
            </ul>

            <h2>6. Intellectual Property</h2>
            <p>
              The Tildra name, logo, website design, and other proprietary materials are owned by us and protected by
              intellectual property laws. You may not use, reproduce, or distribute our intellectual property without
              our prior written consent.
            </p>

            <h2>7. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Tildra shall not be liable for any indirect, incidental, special,
              consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or
              indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from your use of our
              services.
            </p>

            <h2>8. Disclaimer of Warranties</h2>
            <p>
              Our services are provided on an "as is" and "as available" basis. We make no warranties, expressed or
              implied, regarding the reliability, accuracy, or availability of our services.
            </p>

            <h2>9. Modifications to Terms</h2>
            <p>
              We reserve the right to modify these Terms of Service at any time. We will notify users of any significant
              changes by posting the new Terms on our website and updating the "Last Updated" date.
            </p>

            <h2>10. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of [Your Jurisdiction], without
              regard to its conflict of law provisions.
            </p>

            <h2>11. Contact Information</h2>
            <p>
              If you have any questions about these Terms, please{" "}
              <Link href="/contact-us" className="text-primary hover:underline">
                contact us
              </Link>
              .
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
