import Link from "next/link"
import { ArrowLeft, Shield, Eye, Users, Lock, FileText, Scale, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "Privacy Policy - Tildra",
  description: "Learn about how Tildra collects, uses, and protects your personal information",
}

export default function PrivacyPolicyPage() {
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
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-foreground">Privacy Policy</h1>
                <p className="text-foreground/70">How we protect and handle your data</p>
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
                { id: "introduction", title: "1. Introduction", icon: Eye },
                { id: "information-collection", title: "2. Information We Collect", icon: Users },
                { id: "information-use", title: "3. How We Use Your Information", icon: Lock },
                { id: "data-security", title: "4. Data Security", icon: Shield },
                { id: "third-party", title: "5. Third-Party Services", icon: Users },
                { id: "your-rights", title: "6. Your Rights", icon: Scale },
                { id: "policy-changes", title: "7. Changes to This Policy", icon: FileText },
                { id: "contact", title: "8. Contact Us", icon: MessageCircle }
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
            <section id="introduction" className="mb-12">
              <h2 className="flex items-center gap-2 text-2xl font-semibold mb-4">
                <Eye className="h-6 w-6 text-primary" />
                1. Introduction
              </h2>
              <p>
                Welcome to Tildra ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the
                security of your personal information. This Privacy Policy explains how we collect, use, disclose, and
                safeguard your information when you use our website and services.
              </p>
            </section>

            <section id="information-collection" className="mb-12">
              <h2 className="flex items-center gap-2 text-2xl font-semibold mb-4">
                <Users className="h-6 w-6 text-primary" />
                2. Information We Collect
              </h2>
              <p>We may collect information about you in various ways, including:</p>
              <div className="grid gap-4 mt-4">
                <div className="bg-card border rounded-lg p-4">
                  <h3 className="font-semibold text-primary mb-2">Personal Information</h3>
                  <p className="text-sm text-foreground/70">
                    Name, email address, and other contact details you provide when using our services or contacting us.
                  </p>
                </div>
                <div className="bg-card border rounded-lg p-4">
                  <h3 className="font-semibold text-primary mb-2">Usage Data</h3>
                  <p className="text-sm text-foreground/70">
                    Information about how you use our website and services, including browser type, time spent on pages, and other analytics data.
                  </p>
                </div>
                <div className="bg-card border rounded-lg p-4">
                  <h3 className="font-semibold text-primary mb-2">Content Data</h3>
                  <p className="text-sm text-foreground/70">
                    The articles and text you submit for summarization.
                  </p>
                </div>
              </div>
            </section>

            <section id="information-use" className="mb-12">
              <h2 className="flex items-center gap-2 text-2xl font-semibold mb-4">
                <Lock className="h-6 w-6 text-primary" />
                3. How We Use Your Information
              </h2>
              <p>We use the information we collect for various purposes, including:</p>
              <ul className="space-y-2 mt-4">
                <li className="flex items-start gap-2">
                  <div className="h-2 w-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <span>Providing and maintaining our services</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-2 w-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <span>Improving and personalizing your experience</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-2 w-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <span>Communicating with you about updates or changes to our services</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-2 w-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <span>Analyzing usage patterns to enhance our website and services</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-2 w-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <span>Detecting and preventing fraudulent or unauthorized activity</span>
                </li>
              </ul>
            </section>

            <section id="data-security" className="mb-12">
              <h2 className="flex items-center gap-2 text-2xl font-semibold mb-4">
                <Shield className="h-6 w-6 text-primary" />
                4. Data Security
              </h2>
              <div className="bg-card border rounded-lg p-6">
                <p>
                  We implement appropriate security measures to protect your personal information from unauthorized access,
                  alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic
                  storage is 100% secure, and we cannot guarantee absolute security.
                </p>
              </div>
            </section>

            <section id="third-party" className="mb-12">
              <h2 className="flex items-center gap-2 text-2xl font-semibold mb-4">
                <Users className="h-6 w-6 text-primary" />
                5. Third-Party Services
              </h2>
              <p>
                We may use third-party services to help us operate our website and services. These third parties have
                access to your personal information only to perform specific tasks on our behalf and are obligated not to
                disclose or use it for any other purpose.
              </p>
            </section>

            <section id="your-rights" className="mb-12">
              <h2 className="flex items-center gap-2 text-2xl font-semibold mb-4">
                <Scale className="h-6 w-6 text-primary" />
                6. Your Rights
              </h2>
              <p>
                Depending on your location, you may have certain rights regarding your personal information, including:
              </p>
              <div className="grid gap-3 mt-4">
                {[
                  "The right to access the personal information we hold about you",
                  "The right to request correction of inaccurate information",
                  "The right to request deletion of your personal information",
                  "The right to object to processing of your personal information",
                  "The right to data portability"
                ].map((right, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-card border rounded-lg">
                    <Scale className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{right}</span>
                  </div>
                ))}
              </div>
            </section>

            <section id="policy-changes" className="mb-12">
              <h2 className="flex items-center gap-2 text-2xl font-semibold mb-4">
                <FileText className="h-6 w-6 text-primary" />
                7. Changes to This Privacy Policy
              </h2>
              <p>
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new
                Privacy Policy on this page and updating the "Last Updated" date.
              </p>
            </section>

            <section id="contact" className="mb-12">
              <h2 className="flex items-center gap-2 text-2xl font-semibold mb-4">
                <MessageCircle className="h-6 w-6 text-primary" />
                8. Contact Us
              </h2>
              <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-lg p-6">
                <p className="mb-4">
                  If you have any questions about this Privacy Policy, please don't hesitate to reach out to us.
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
            <Link href="/terms-of-service" className="flex items-center text-sm text-foreground/60 hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Terms of Service
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
