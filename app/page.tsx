import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowRight, Users, Briefcase, CheckSquare, HeadphonesIcon, FileText, TrendingUp, Linkedin } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href="/" className="flex items-center">
                <Image
                  src="/stellaris-logo-new.png"
                  alt="Stellaris IT Consulting & Resourcing"
                  width={220}
                  height={50}
                  className="h-10 w-auto"
                  priority
                />
              </Link>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Features
              </Link>
              <Link href="#modules" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Modules
              </Link>
              <Link href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </Link>
            </nav>
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Sign up</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-balance leading-tight mb-6">
                Manage your entire business in one <span className="text-primary">powerful platform</span>
              </h1>
              <p className="text-lg text-muted-foreground text-pretty mb-8 leading-relaxed">
                Streamline lead management, client relationships, projects, tasks, support tickets, and invoicing. Built
                for teams that need enterprise-grade features with startup agility.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Link href="/register">
                  <Button size="lg" className="group">
                    Get started free
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="/demo">
                  <Button size="lg" variant="outline">
                    View demo
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative lg:h-125">
              <div className="absolute inset-0 bg-linear-to-tr from-primary/20 to-transparent rounded-3xl" />
              <div className="relative h-full rounded-3xl border border-border bg-card/50 backdrop-blur-sm p-8 flex items-center justify-center">
                <div className="grid grid-cols-2 gap-4 w-full">
                  <div className="bg-secondary rounded-lg p-4 border border-border">
                    <div className="text-2xl font-bold mb-1">2,847</div>
                    <div className="text-sm text-muted-foreground">Active Leads</div>
                    <div className="text-xs text-success mt-2">+12.5% this month</div>
                  </div>
                  <div className="bg-secondary rounded-lg p-4 border border-border">
                    <div className="text-2xl font-bold mb-1">$127K</div>
                    <div className="text-sm text-muted-foreground">Revenue</div>
                    <div className="text-xs text-success mt-2">+8.3% this month</div>
                  </div>
                  <div className="bg-secondary rounded-lg p-4 border border-border">
                    <div className="text-2xl font-bold mb-1">94.2%</div>
                    <div className="text-sm text-muted-foreground">Conversion</div>
                    <div className="text-xs text-info mt-2">Above target</div>
                  </div>
                  <div className="bg-secondary rounded-lg p-4 border border-border">
                    <div className="text-2xl font-bold mb-1">18</div>
                    <div className="text-sm text-muted-foreground">Projects</div>
                    <div className="text-xs text-warning mt-2">5 due soon</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section id="modules" className="py-20 bg-card/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-balance">
              Everything you need to run your business
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
              Seven integrated modules working together seamlessly to power your entire operation
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: TrendingUp,
                title: "Lead Management",
                description:
                  "Track leads through your sales pipeline with conversion analytics and automated workflows",
              },
              {
                icon: Users,
                title: "Client Management",
                description: "Centralized client database with complete interaction history and relationship tracking",
              },
              {
                icon: Briefcase,
                title: "Project Management",
                description:
                  "Plan, execute, and deliver projects on time with resource allocation and milestone tracking",
              },
              {
                icon: CheckSquare,
                title: "Task Management",
                description: "Assign, prioritize, and track tasks with time tracking and team collaboration features",
              },
              {
                icon: HeadphonesIcon,
                title: "Support Tickets",
                description: "Manage customer support requests with SLA tracking and automated escalation",
              },
              {
                icon: FileText,
                title: "Billing & Invoicing",
                description: "Generate professional invoices, track payments, and manage your cash flow",
              },
            ].map((module, index) => (
              <div
                key={index}
                className="group relative rounded-xl border border-border bg-card p-6 hover:border-primary/50 transition-all"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <module.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{module.title}</h3>
                <p className="text-muted-foreground text-pretty leading-relaxed">{module.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-balance">
            Ready to transform your business operations?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 text-pretty">
            Join thousands of teams already using CRM Portal to streamline their workflows
          </p>
          <Link href="/register">
            <Button size="lg" className="group">
              Start free trial
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-16 bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-4">
              <Link href="/" className="inline-flex items-center">
                <Image
                  src="/stellaris-logo-new.png"
                  alt="Stellaris IT Consulting & Resourcing"
                  width={220}
                  height={50}
                  className="h-10 w-auto"
                />
              </Link>
              <p className="text-sm leading-relaxed max-w-sm text-primary-foreground/90">
                We are an Australia based IT professional services company, providing end-to-end recruitment solutions
                and IT consultancy to help deliver successful outcomes.
              </p>
              <div className="space-y-1 text-sm">
                <p className="font-semibold">1300 922 358</p>
                <p>contact@stellarisconsulting.com.au</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-base font-semibold tracking-wide">Our Services</h3>
              <ul className="space-y-2 text-sm">
                <li>Consulting Services</li>
                <li>IT Professional Services</li>
                <li>Hiring Solutions</li>
                <li>Support</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-base font-semibold tracking-wide">Follow Us</h3>
              <div className="flex items-center gap-3">
                <Link
                  href="https://www.linkedin.com"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-primary-foreground/40 bg-primary/20 hover:bg-primary-foreground/10 transition-colors"
                  aria-label="Follow Stellaris on LinkedIn"
                >
                  <Linkedin className="h-5 w-5" />
                </Link>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-base font-semibold tracking-wide">Business hours</h3>
              <p className="text-sm leading-relaxed text-primary-foreground/90">
                We operate normal hours as per the geographic location of client sites, however we endeavour to support
                you 24/7.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs md:text-sm text-primary-foreground/80 text-center md:text-left">
              © 2026 Stellaris Consulting Australia Pty Ltd. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs md:text-sm text-primary-foreground/80">
              <Link href="#" className="hover:underline">
                Privacy Policy
              </Link>
              <span className="hidden md:inline">•</span>
              <Link href="#" className="hover:underline">
                Terms of Use
              </Link>
              <span className="hidden md:inline">•</span>
              <Link href="#" className="hover:underline">
                WHS
              </Link>
              <span className="hidden md:inline">•</span>
              <Link href="#" className="hover:underline">
                Disclaimer
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
