"use client";

import Link from "next/link";
import {
  ArrowLeft,
  GraduationCap,
  Target,
  Heart,
  Shield,
  Users,
  Lightbulb,
  Globe,
} from "lucide-react";

const teamMembers = [
  {
    name: "Rajesh Kumar",
    role: "Founder & CEO",
    bio: "Former school principal with 20+ years in education management. Passionate about bringing technology to traditional institutions.",
  },
  {
    name: "Priya Sharma",
    role: "Chief Technology Officer",
    bio: "Full-stack engineer with a decade of experience building scalable SaaS platforms for the education sector.",
  },
  {
    name: "Amit Patel",
    role: "Head of Product",
    bio: "EdTech product strategist who has helped over 500 institutions digitize their administrative workflows.",
  },
  {
    name: "Sneha Reddy",
    role: "Head of Customer Success",
    bio: "Dedicated to ensuring every institution gets maximum value from CampusIQ through hands-on onboarding and support.",
  },
];

const values = [
  {
    icon: Target,
    title: "Mission-Driven",
    description:
      "Every feature we build is guided by one question: does this make institution administration simpler and more effective?",
  },
  {
    icon: Shield,
    title: "Trust & Security",
    description:
      "We handle sensitive student data with the highest standards of security, encryption, and compliance.",
  },
  {
    icon: Heart,
    title: "Customer First",
    description:
      "Our success is measured by the success of the institutions we serve. We listen, adapt, and deliver.",
  },
  {
    icon: Lightbulb,
    title: "Innovation",
    description:
      "We continuously evolve our platform with AI-driven insights, automation, and modern design principles.",
  },
  {
    icon: Users,
    title: "Inclusivity",
    description:
      "We design for institutions of all sizes — from small rural institutions to large urban campuses — ensuring everyone benefits.",
  },
  {
    icon: Globe,
    title: "Impact at Scale",
    description:
      "We aim to transform education administration across India and beyond, one institution at a time.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
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
            About CampusIQ
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            We&apos;re on a mission to simplify institution management so
            educators can focus on what matters most — teaching and inspiring
            the next generation.
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            Our Story
          </h2>
          <div className="prose prose-lg dark:prose-invert max-w-none space-y-4 text-gray-600 dark:text-gray-300">
            <p>
              CampusIQ was born in 2022 out of a simple observation:
              institutions across India were drowning in paperwork. Attendance
              registers, fee receipts, exam schedules, timetable management —
              everything was manual, error-prone, and time-consuming.
            </p>
            <p>
              Our founder, Rajesh Kumar, spent over two decades as a school
              principal and witnessed first-hand how administrative burdens
              pulled teachers away from classrooms. He partnered with a team of
              experienced engineers and product designers to build a
              comprehensive, affordable, and easy-to-use institution management
              platform.
            </p>
            <p>
              Today, CampusIQ serves hundreds of institutions, manages data for
              over 200,000 students, and processes millions of attendance
              records every month. We&apos;re proud to be a trusted partner for
              institutions ranging from small K-8 institutions to large
              university-affiliated campuses.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 sm:py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Our Values
            </h2>
            <p className="mt-4 text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              These principles guide every decision we make and every line of
              code we write.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {values.map((value) => (
              <div
                key={value.title}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/40 mb-4">
                  <value.icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {value.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Meet Our Team
            </h2>
            <p className="mt-4 text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              A passionate group of educators, engineers, and designers working
              together to transform institution management.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {teamMembers.map((member) => (
              <div
                key={member.name}
                className="text-center bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {member.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {member.name}
                </h3>
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-3">
                  {member.role}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {member.bio}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-blue-600 dark:bg-blue-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Transform Your Institution?
          </h2>
          <p className="text-blue-100 mb-8 text-lg">
            Join hundreds of institutions that trust CampusIQ for their daily
            operations.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center px-8 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors shadow-lg"
          >
            Get Started Free
          </Link>
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
