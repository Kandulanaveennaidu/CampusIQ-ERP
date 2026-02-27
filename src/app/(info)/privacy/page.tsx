"use client";

import Link from "next/link";
import {
  ArrowLeft,
  GraduationCap,
  Shield,
  Lock,
  Eye,
  Database,
  UserCheck,
  Mail,
} from "lucide-react";

const sections = [
  {
    id: "information-we-collect",
    title: "1. Information We Collect",
    icon: Database,
    content: [
      {
        subtitle: "Personal Information",
        text: "When institutions register on CampusIQ, we collect institutional details such as institution name, address, administrator contact information, email addresses, and phone numbers. For student and staff records managed within the platform, institutions input names, dates of birth, contact details, academic records, attendance data, and fee information.",
      },
      {
        subtitle: "Usage Data",
        text: "We automatically collect information about how you interact with our platform, including IP addresses, browser type, device information, pages visited, features used, and timestamps. This data helps us improve our services and troubleshoot issues.",
      },
      {
        subtitle: "Cookies & Tracking",
        text: "We use essential cookies to maintain your session and preferences. We also use analytics cookies to understand usage patterns. You can control cookie preferences through your browser settings.",
      },
    ],
  },
  {
    id: "how-we-use",
    title: "2. How We Use Your Information",
    icon: Eye,
    content: [
      {
        subtitle: "",
        text: "We use the information we collect to: provide and maintain our institution management services; process attendance, fees, exams, and other institution operations; send important notifications and updates about our service; respond to customer support requests; analyze usage patterns to improve our platform; comply with legal obligations and protect against misuse.",
      },
    ],
  },
  {
    id: "data-sharing",
    title: "3. Data Sharing & Disclosure",
    icon: UserCheck,
    content: [
      {
        subtitle: "",
        text: "We do not sell, rent, or trade your personal data to third parties. We may share data with: trusted service providers who assist us in operating our platform (hosting, email delivery, analytics) under strict data protection agreements; law enforcement or regulatory bodies when required by law or to protect our legal rights; a successor entity in the event of a merger, acquisition, or business restructuring — with prior notice to affected users.",
      },
    ],
  },
  {
    id: "data-security",
    title: "4. Data Security",
    icon: Lock,
    content: [
      {
        subtitle: "",
        text: "We implement industry-standard security measures including: AES-256 encryption for data at rest; TLS 1.3 encryption for data in transit; regular security audits and penetration testing; role-based access controls and multi-factor authentication; automated backups with geo-redundant storage; SOC 2 Type II compliance practices. While no system is 100% secure, we take every reasonable measure to protect your data from unauthorized access, alteration, or destruction.",
      },
    ],
  },
  {
    id: "data-retention",
    title: "5. Data Retention",
    icon: Database,
    content: [
      {
        subtitle: "",
        text: "We retain institution and student data for as long as your account is active or as needed to provide services. When an institution terminates its subscription, we retain data for 90 days to allow for data export, after which it is permanently deleted from our servers. Backup copies are purged within 30 days of primary deletion. Certain records may be retained longer to comply with legal, tax, or regulatory requirements.",
      },
    ],
  },
  {
    id: "your-rights",
    title: "6. Your Rights",
    icon: Shield,
    content: [
      {
        subtitle: "",
        text: "Depending on your jurisdiction, you may have the following rights regarding your personal data: Right to Access — request a copy of the personal data we hold about you; Right to Rectification — request correction of inaccurate or incomplete data; Right to Erasure — request deletion of your personal data under certain circumstances; Right to Data Portability — request your data in a structured, machine-readable format; Right to Object — object to certain processing activities; Right to Restrict Processing — request limitation of how we use your data. To exercise any of these rights, please contact our Data Protection Officer at privacy@campusiq.in.",
      },
    ],
  },
  {
    id: "childrens-privacy",
    title: "7. Children's Privacy",
    icon: UserCheck,
    content: [
      {
        subtitle: "",
        text: "CampusIQ is an institution management platform and may process data of minors as part of student records. This data is provided and managed by authorized institution administrators, not collected directly from children. Institutions are responsible for obtaining necessary parental consents as required by applicable laws, including COPPA and local data protection regulations. We do not knowingly collect personal information directly from children under 13.",
      },
    ],
  },
];

export default function PrivacyPage() {
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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/40 mb-6">
            <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Privacy Policy
          </h1>
          <p className="mt-4 text-gray-500 dark:text-gray-400">
            Last updated: January 15, 2026
          </p>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Your privacy matters to us. This policy explains how CampusIQ
            collects, uses, and protects your information.
          </p>
        </div>
      </section>

      {/* Table of Contents */}
      <section className="py-10 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Table of Contents
          </h2>
          <nav className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                {section.title}
              </a>
            ))}
            <a
              href="#contact"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              8. Contact Us
            </a>
          </nav>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Intro */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              CampusIQ (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is
              committed to protecting the privacy of institutions, students,
              parents, and staff who use our institution management platform.
              This Privacy Policy describes our practices regarding the
              collection, use, and disclosure of information when you use our
              services.
            </p>
          </div>

          {sections.map((section) => (
            <div key={section.id} id={section.id} className="scroll-mt-20">
              <div className="flex items-center gap-3 mb-4">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800">
                  <section.icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {section.title}
                </h2>
              </div>
              <div className="space-y-4 pl-0 sm:pl-13">
                {section.content.map((block, i) => (
                  <div key={i}>
                    {block.subtitle && (
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                        {block.subtitle}
                      </h3>
                    )}
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                      {block.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Contact */}
          <div id="contact" className="scroll-mt-20">
            <div className="flex items-center gap-3 mb-4">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800">
                <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                8. Contact Us
              </h2>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                If you have any questions about this Privacy Policy or wish to
                exercise your data rights, please contact us:
              </p>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400 text-sm">
                <li>
                  <strong className="text-gray-900 dark:text-white">
                    Email:
                  </strong>{" "}
                  privacy@campusiq.in
                </li>
                <li>
                  <strong className="text-gray-900 dark:text-white">
                    Address:
                  </strong>{" "}
                  CampusIQ Technologies Pvt. Ltd., Hitech City, Hyderabad,
                  Telangana 500081, India
                </li>
                <li>
                  <strong className="text-gray-900 dark:text-white">
                    Data Protection Officer:
                  </strong>{" "}
                  dpo@campusiq.in
                </li>
              </ul>
            </div>
          </div>
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
