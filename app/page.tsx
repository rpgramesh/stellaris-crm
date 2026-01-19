import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  BarChart3,
  Users,
  Briefcase,
  CheckSquare,
  HeadphonesIcon,
  FileText,
  TrendingUp,
} from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <BarChart3 className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-semibold text-foreground">CRM Portal</span>
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
            <div className="relative lg:h-[500px]">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent rounded-3xl" />
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
      <footer className="border-t border-border bg-card/30 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <BarChart3 className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold">CRM Portal</span>
            </div>
            <p className="text-sm text-muted-foreground">© 2026 CRM Portal. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
