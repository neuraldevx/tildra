import { Logo } from "@/components/ui/logo"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import Link from "next/link"

export const metadata = {
  title: "Privacy Policy - Tildra",
  description: "Learn about how Tildra collects, uses, and protects your personal information",
}

export default function PrivacyPolicyPage() {
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
          <h1 className="text-3xl font-bold mb-6 text-foreground">Privacy Policy</h1>

          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p className="text-foreground/70">Last Updated: April 9, 2025</p>

            <h2>1. Introduction</h2>
            <p>
              Welcome to Tildra ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the
              security of your personal information. This Privacy Policy explains how we collect, use, disclose, and
              safeguard your information when you use our website and services.
            </p>

            <h2>2. Information We Collect</h2>
            <p>We may collect information about you in various ways, including:</p>
            <ul>
              <li>
                <strong>Personal Information:</strong> Name, email address, and other contact details you provide when
                using our services or contacting us.
              </li>
              <li>
                <strong>Usage Data:</strong> Information about how you use our website and services, including browser
                type, time spent on pages, and other analytics data.
              </li>
              <li>
                <strong>Content Data:</strong> The articles and text you submit for summarization.
              </li>
            </ul>

            <h2>3. How We Use Your Information</h2>
            <p>We use the information we collect for various purposes, including:</p>
            <ul>
              <li>Providing and maintaining our services</li>
              <li>Improving and personalizing your experience</li>
              <li>Communicating with you about updates or changes to our services</li>
              <li>Analyzing usage patterns to enhance our website and services</li>
              <li>Detecting and preventing fraudulent or unauthorized activity</li>
            </ul>

            <h2>4. Data Security</h2>
            <p>
              We implement appropriate security measures to protect your personal information from unauthorized access,
              alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic
              storage is 100% secure, and we cannot guarantee absolute security.
            </p>

            <h2>5. Third-Party Services</h2>
            <p>
              We may use third-party services to help us operate our website and services. These third parties have
              access to your personal information only to perform specific tasks on our behalf and are obligated not to
              disclose or use it for any other purpose.
            </p>

            <h2>6. Your Rights</h2>
            <p>
              Depending on your location, you may have certain rights regarding your personal information, including:
            </p>
            <ul>
              <li>The right to access the personal information we hold about you</li>
              <li>The right to request correction of inaccurate information</li>
              <li>The right to request deletion of your personal information</li>
              <li>The right to object to processing of your personal information</li>
              <li>The right to data portability</li>
            </ul>

            <h2>7. Changes to This Privacy Policy</h2>
            <p>
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new
              Privacy Policy on this page and updating the "Last Updated" date.
            </p>

            <h2>8. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please{" "}
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
