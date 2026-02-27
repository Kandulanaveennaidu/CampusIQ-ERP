"use client";

import Link from "next/link";
import {
  ArrowLeft,
  GraduationCap,
  MapPin,
  Clock,
  Briefcase,
  Heart,
  Coffee,
  Laptop,
  TreePine,
  Zap,
  Users,
  BookOpen,
  ArrowRight,
} from "lucide-react";

const openings = [
  {
    title: "Senior Full-Stack Engineer",
    team: "Engineering",
    location: "Hyderabad, India (Hybrid)",
    type: "Full-time",
    description:
      "Build and scale core platform features using Next.js, TypeScript, and MongoDB. You'll work on attendance systems, fee modules, and real-time dashboards serving hundreds of institutions.",
  },
  {
    title: "Product Designer (UI/UX)",
    team: "Design",
    location: "Remote, India",
    type: "Full-time",
    description:
      "Design intuitive interfaces for institution administrators, teachers, and parents. Own the design system and create user flows that simplify complex workflows.",
  },
  {
    title: "DevOps / Infrastructure Engineer",
    team: "Engineering",
    location: "Hyderabad, India (Hybrid)",
    type: "Full-time",
    description:
      "Manage our cloud infrastructure on AWS, implement CI/CD pipelines, monitoring, and ensure 99.9% uptime for our multi-tenant SaaS platform.",
  },
  {
    title: "Customer Success Manager",
    team: "Customer Success",
    location: "Hyderabad, India (On-site)",
    type: "Full-time",
    description:
      "Onboard new institution clients, conduct training sessions, and ensure long-term adoption. Be the voice of the customer within the product team.",
  },
  {
    title: "QA Automation Engineer",
    team: "Engineering",
    location: "Remote, India",
    type: "Full-time",
    description:
      "Build and maintain automated test suites for web and API. Ensure quality across attendance, exams, fees, and other critical modules.",
  },
  {
    title: "Content & Growth Marketing Specialist",
    team: "Marketing",
    location: "Remote, India",
    type: "Full-time",
    description:
      "Create compelling content — blog posts, case studies, social media — that drives awareness and leads for CampusIQ in the EdTech space.",
  },
];

const benefits = [
  {
    icon: Laptop,
    title: "Flexible Work",
    description:
      "Hybrid & remote options with flexible hours. Work from where you're most productive.",
  },
  {
    icon: Heart,
    title: "Health & Wellness",
    description:
      "Comprehensive health insurance for you and your family, plus mental wellness support.",
  },
  {
    icon: BookOpen,
    title: "Learning Budget",
    description:
      "₹50,000 annual learning stipend for courses, conferences, and books of your choice.",
  },
  {
    icon: Coffee,
    title: "Team Culture",
    description:
      "Regular team outings, hackathons, and a collaborative environment where ideas thrive.",
  },
  {
    icon: TreePine,
    title: "Generous PTO",
    description:
      "30 days paid vacation, plus public holidays and flexible sick leave — no questions asked.",
  },
  {
    icon: Zap,
    title: "Equity & Growth",
    description:
      "Employee stock options and clear career progression paths with regular reviews.",
  },
];

const cultureValues = [
  {
    title: "Impact Over Output",
    description:
      "We measure success by the institutions we empower, not the hours we clock.",
  },
  {
    title: "Ownership Mindset",
    description:
      "Everyone owns their work end-to-end — from ideation to production.",
  },
  {
    title: "Radical Transparency",
    description:
      "Open financials, shared roadmaps, and honest conversations at every level.",
  },
  {
    title: "Continuous Learning",
    description:
      "We invest in growth — weekly knowledge shares, mentorship, and a culture of curiosity.",
  },
];

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              CampusIQ
            </span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Join the CampusIQ Team
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Help us build the future of institution management. We&apos;re
            looking for passionate people who want to make education
            administration effortless.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              40+ team members
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              Hyderabad & Remote
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Briefcase className="h-4 w-4" />
              {openings.length} open positions
            </span>
          </div>
        </div>
      </section>

      {/* Culture */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Our Culture
            </h2>
            <p className="mt-4 text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              We&apos;re building more than a product — we&apos;re creating a
              workplace where talented people do the best work of their careers.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {cultureValues.map((item) => (
              <div
                key={item.title}
                className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 rounded-xl p-6 border border-blue-100 dark:border-gray-700"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Benefits & Perks
            </h2>
            <p className="mt-4 text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              We take care of our team so they can take care of our customers.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/40 mb-4">
                  <benefit.icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {benefit.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Open Positions
            </h2>
            <p className="mt-4 text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              Find your next role at CampusIQ. We&apos;re growing fast and
              looking for talented individuals across all departments.
            </p>
          </div>
          <div className="space-y-4">
            {openings.map((job) => (
              <div
                key={job.title}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-md transition-shadow group"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                        {job.team}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {job.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
                      {job.description}
                    </p>
                    <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500 dark:text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {job.location}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {job.type}
                      </span>
                    </div>
                  </div>
                  <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-sm whitespace-nowrap self-start">
                    Apply Now
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-blue-600 dark:bg-blue-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Don&apos;t See the Right Role?
          </h2>
          <p className="text-blue-100 mb-8 text-lg max-w-xl mx-auto">
            We&apos;re always looking for exceptional people. Send us your
            resume and tell us how you&apos;d like to contribute to CampusIQ.
          </p>
          <a
            href="mailto:careers@campusiq.in"
            className="inline-flex items-center px-8 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors shadow-lg"
          >
            Send Your Resume
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <span className="font-semibold text-gray-900 dark:text-white">
                CampusIQ
              </span>
            </div>
            <nav className="flex flex-wrap justify-center gap-6 text-sm text-gray-600 dark:text-gray-400">
              <Link
                href="/about"
                className="hover:text-blue-600 dark:hover:text-blue-400"
              >
                About
              </Link>
              <Link
                href="/blog"
                className="hover:text-blue-600 dark:hover:text-blue-400"
              >
                Blog
              </Link>
              <Link
                href="/careers"
                className="hover:text-blue-600 dark:hover:text-blue-400"
              >
                Careers
              </Link>
              <Link
                href="/privacy"
                className="hover:text-blue-600 dark:hover:text-blue-400"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="hover:text-blue-600 dark:hover:text-blue-400"
              >
                Terms
              </Link>
            </nav>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              &copy; {new Date().getFullYear()} CampusIQ. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
