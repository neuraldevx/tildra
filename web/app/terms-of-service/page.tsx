import Link from "next/link"
import { ArrowLeft, FileText, CheckCircle, Users, AlertTriangle, Shield, Scale, RefreshCw, Globe, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "Terms of Service - Tildra",
  description: "Read the terms and conditions for using Tildra's services",
}

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-transparent py-16 border-b">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Link href="/" className="inline-flex items-center text-sm text-foreground/60 hover:text-foreground mb-6 transition-colors">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-foreground">Terms of Service</h1>
                <p className="text-foreground/70">Our terms and conditions</p>
              </div>
            </div>
            
            <p className="text-sm text-foreground/60 bg-background/60 backdrop-blur-sm rounded-lg px-4 py-2 inline-block">
              Last Updated: April 9, 2025
            </p>
          </div>
        </div>
      </div>

      {/* Table of Contents */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-card border rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Table of Contents
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                { id: "acceptance", title: "1. Acceptance of Terms", icon: CheckCircle },
                { id: "service-description", title: "2. Description of Service", icon: FileText },
                { id: "user-accounts", title: "3. User Accounts", icon: Users },
                { id: "user-content", title: "4. User Content", icon: FileText },
                { id: "prohibited-uses", title: "5. Prohibited Uses", icon: AlertTriangle },
                { id: "intellectual-property", title: "6. Intellectual Property", icon: Shield },
                { id: "limitation-liability", title: "7. Limitation of Liability", icon: Scale },
                { id: "warranty-disclaimer", title: "8. Disclaimer of Warranties", icon: AlertTriangle },
                { id: "modifications", title: "9. Modifications to Terms", icon: RefreshCw },
                { id: "governing-law", title: "10. Governing Law", icon: Globe },
                { id: "contact-info", title: "11. Contact Information", icon: MessageCircle }
              ].map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="flex items-center gap-2 text-sm text-foreground/70 hover:text-primary transition-colors p-2 rounded hover:bg-primary/5"
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </a>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <section id="acceptance" className="mb-12">
              <h2 className="flex items-center gap-2 text-2xl font-semibold mb-4">
                <CheckCircle className="h-6 w-6 text-primary" />
                1. Acceptance of Terms
              </h2>
              <div className="bg-card border rounded-lg p-6">
                <p>
                  By accessing or using Tildra's website and services, you agree to be bound by these Terms of Service. If
                  you do not agree to these terms, please do not use our services.
                </p>
              </div>
            </section>

            <section id="service-description" className="mb-12">
              <h2 className="flex items-center gap-2 text-2xl font-semibold mb-4">
                <FileText className="h-6 w-6 text-primary" />
                2. Description of Service
              </h2>
              <p>
                Tildra provides an AI-powered article summarization service that generates concise summaries and key
                points from longer texts. Our service is designed to help users quickly understand the essence of articles
                without reading the entire content.
              </p>
            </section>

            <section id="user-accounts" className="mb-12">
              <h2 className="flex items-center gap-2 text-2xl font-semibold mb-4">
                <Users className="h-6 w-6 text-primary" />
                3. User Accounts
              </h2>
              <div className="bg-card border rounded-lg p-6">
                <p>
                  Some features of our service may require you to create an account. You are responsible for maintaining the
                  confidentiality of your account information and for all activities that occur under your account. You
                  agree to notify us immediately of any unauthorized use of your account.
                </p>
              </div>
            </section>

            <section id="user-content" className="mb-12">
              <h2 className="flex items-center gap-2 text-2xl font-semibold mb-4">
                <FileText className="h-6 w-6 text-primary" />
                4. User Content
              </h2>
              <p>
                When you submit content to our service for summarization, you retain ownership of that content. However,
                you grant us a non-exclusive, worldwide, royalty-free license to use, store, and process the content
                solely for the purpose of providing our services to you.
              </p>
            </section>

            <section id="prohibited-uses" className="mb-12">
              <h2 className="flex items-center gap-2 text-2xl font-semibold mb-4">
                <AlertTriangle className="h-6 w-6 text-primary" />
                5. Prohibited Uses
              </h2>
              <p>
                You agree not to use our services for any unlawful purpose or in any way that could damage, disable,
                overburden, or impair our services. Prohibited activities include but are not limited to:
              </p>
              <div className="grid gap-3 mt-4">
                {[
                  "Violating any applicable laws or regulations",
                  "Infringing upon the intellectual property rights of others",
                  "Attempting to gain unauthorized access to our systems or user accounts",
                  "Using our services to distribute malware or other harmful content",
                  "Engaging in any activity that interferes with or disrupts our services"
                ].map((prohibition, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{prohibition}</span>
                  </div>
                ))}
              </div>
            </section>

            <section id="intellectual-property" className="mb-12">
              <h2 className="flex items-center gap-2 text-2xl font-semibold mb-4">
                <Shield className="h-6 w-6 text-primary" />
                6. Intellectual Property
              </h2>
              <div className="bg-card border rounded-lg p-6">
                <p>
                  The Tildra name, logo, website design, and other proprietary materials are owned by us and protected by
                  intellectual property laws. You may not use, reproduce, or distribute our intellectual property without
                  our prior written consent.
                </p>
              </div>
            </section>

            <section id="limitation-liability" className="mb-12">
              <h2 className="flex items-center gap-2 text-2xl font-semibold mb-4">
                <Scale className="h-6 w-6 text-primary" />
                7. Limitation of Liability
              </h2>
              <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
                <p>
                  To the maximum extent permitted by law, Tildra shall not be liable for any indirect, incidental, special,
                  consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or
                  indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from your use of our
                  services.
                </p>
              </div>
            </section>

            <section id="warranty-disclaimer" className="mb-12">
              <h2 className="flex items-center gap-2 text-2xl font-semibold mb-4">
                <AlertTriangle className="h-6 w-6 text-primary" />
                8. Disclaimer of Warranties
              </h2>
              <p>
                Our services are provided on an "as is" and "as available" basis. We make no warranties, expressed or
                implied, regarding the reliability, accuracy, or availability of our services.
              </p>
            </section>

            <section id="modifications" className="mb-12">
              <h2 className="flex items-center gap-2 text-2xl font-semibold mb-4">
                <RefreshCw className="h-6 w-6 text-primary" />
                9. Modifications to Terms
              </h2>
              <div className="bg-card border rounded-lg p-6">
                <p>
                  We reserve the right to modify these Terms of Service at any time. We will notify users of any significant
                  changes by posting the new Terms on our website and updating the "Last Updated" date.
                </p>
              </div>
            </section>

            <section id="governing-law" className="mb-12">
              <h2 className="flex items-center gap-2 text-2xl font-semibold mb-4">
                <Globe className="h-6 w-6 text-primary" />
                10. Governing Law
              </h2>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of [Your Jurisdiction], without
                regard to its conflict of law provisions.
              </p>
            </section>

            <section id="contact-info" className="mb-12">
              <h2 className="flex items-center gap-2 text-2xl font-semibold mb-4">
                <MessageCircle className="h-6 w-6 text-primary" />
                11. Contact Information
              </h2>
              <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-lg p-6">
                <p className="mb-4">
                  If you have any questions about these Terms, please don't hesitate to reach out to us.
                </p>
                <Link href="/contact-us">
                  <Button className="gradient-button">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Contact Us
                  </Button>
                </Link>
              </div>
            </section>
          </div>

          {/* Navigation Footer */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-8 border-t">
            <Link href="/privacy-policy" className="flex items-center text-sm text-foreground/60 hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Privacy Policy
            </Link>
            <Link href="/contact-us" className="flex items-center text-sm text-foreground/60 hover:text-foreground transition-colors">
              Contact Us
              <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
