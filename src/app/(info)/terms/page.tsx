"use client";

import Link from "next/link";
import {
  ArrowLeft,
  GraduationCap,
  FileText,
  Scale,
  AlertTriangle,
  CreditCard,
  Ban,
  RefreshCw,
} from "lucide-react";

export default function TermsPage() {
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
            <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Terms of Service
          </h1>
          <p className="mt-4 text-gray-500 dark:text-gray-400">
            Effective Date: January 15, 2026
          </p>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Please read these terms carefully before using CampusIQ. By
            accessing or using our platform, you agree to be bound by these
            terms.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          {/* 1. Acceptance */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800">
                <Scale className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                1. Acceptance of Terms
              </h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              By creating an account, accessing, or using the CampusIQ platform
              (&quot;Service&quot;), you agree to be bound by these Terms of
              Service (&quot;Terms&quot;), our Privacy Policy, and any
              additional guidelines or rules posted on the platform. If you are
              using the Service on behalf of an educational institution, you
              represent that you have the authority to bind that institution to
              these Terms. If you do not agree with any part of these Terms, you
              must not use the Service.
            </p>
          </div>

          {/* 2. Description */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                2. Description of Service
              </h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              CampusIQ is a cloud-based institution management platform that
              provides tools for:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400 ml-4">
              <li>Student enrollment and records management</li>
              <li>Attendance tracking (daily, subject-wise, and QR-based)</li>
              <li>Fee management and payment processing</li>
              <li>Exam scheduling, grading, and report card generation</li>
              <li>Timetable and room allocation management</li>
              <li>Staff and faculty workload management</li>
              <li>Library, hostel, and transport management</li>
              <li>Communication and notification services</li>
              <li>Reports and analytics</li>
            </ul>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mt-4">
              We reserve the right to modify, suspend, or discontinue any part
              of the Service at any time with reasonable notice.
            </p>
          </div>

          {/* 3. Accounts */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800">
                <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                3. User Accounts & Responsibilities
              </h2>
            </div>
            <div className="space-y-4 text-gray-600 dark:text-gray-400 leading-relaxed">
              <p>
                You are responsible for maintaining the confidentiality of your
                account credentials and for all activities that occur under your
                account. You must provide accurate and complete information
                during registration and keep it updated.
              </p>
              <p>You agree to:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>
                  Not share account credentials with unauthorized individuals
                </li>
                <li>
                  Immediately notify us of any unauthorized use of your account
                </li>
                <li>
                  Ensure that all data entered into the platform is accurate and
                  lawfully obtained
                </li>
                <li>
                  Comply with all applicable local, state, and national laws
                  when using the Service
                </li>
                <li>
                  Obtain necessary consents for entering student and staff
                  personal data
                </li>
              </ul>
              <p>
                Institution administrators are responsible for managing user
                roles and permissions within their institution&apos;s account.
              </p>
            </div>
          </div>

          {/* 4. Subscription & Payment */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800">
                <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                4. Subscription & Payment
              </h2>
            </div>
            <div className="space-y-4 text-gray-600 dark:text-gray-400 leading-relaxed">
              <p>
                CampusIQ offers multiple subscription tiers (Starter,
                Professional, and Enterprise). Pricing details are available on
                our website and may be updated with 30 days&apos; notice.
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>
                  Subscriptions are billed monthly or annually, depending on the
                  plan selected.
                </li>
                <li>
                  All fees are non-refundable except as required by law or as
                  stated in our refund policy.
                </li>
                <li>
                  We may suspend access to the Service if payment is overdue by
                  more than 15 days.
                </li>
                <li>
                  Taxes applicable in your jurisdiction will be added to the
                  subscription fee.
                </li>
              </ul>
              <p>
                A free trial period of 14 days is available for new accounts. No
                credit card is required during the trial.
              </p>
            </div>
          </div>

          {/* 5. Intellectual Property */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              5. Intellectual Property
            </h2>
            <div className="space-y-4 text-gray-600 dark:text-gray-400 leading-relaxed">
              <p>
                All content, features, and functionality of the CampusIQ
                platform — including but not limited to text, graphics, logos,
                icons, software, and documentation — are the exclusive property
                of CampusIQ Technologies Pvt. Ltd. and are protected by
                copyright, trademark, and other intellectual property laws.
              </p>
              <p>
                You retain ownership of all data you enter into the platform.
                You grant CampusIQ a limited, non-exclusive license to process
                and store that data solely for the purpose of providing the
                Service.
              </p>
            </div>
          </div>

          {/* 6. Prohibited Use */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800">
                <Ban className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                6. Prohibited Uses
              </h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
              You may not use the Service to:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400 ml-4">
              <li>Violate any applicable law or regulation</li>
              <li>
                Upload malicious code, viruses, or engage in any activity that
                disrupts the Service
              </li>
              <li>
                Attempt to gain unauthorized access to other accounts or systems
              </li>
              <li>Scrape, crawl, or harvest data from the platform</li>
              <li>
                Resell, sublicense, or redistribute the Service without written
                consent
              </li>
              <li>
                Use the platform for any purpose other than institution
                administration management
              </li>
            </ul>
          </div>

          {/* 7. Termination */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800">
                <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                7. Termination
              </h2>
            </div>
            <div className="space-y-4 text-gray-600 dark:text-gray-400 leading-relaxed">
              <p>
                Either party may terminate this agreement at any time. You may
                cancel your subscription through your account settings or by
                contacting our support team.
              </p>
              <p>
                We may terminate or suspend your access immediately, without
                prior notice, if you breach these Terms, engage in fraudulent
                activity, or fail to pay subscription fees.
              </p>
              <p>
                Upon termination, your right to use the Service ceases
                immediately. You will have 90 days to export your data before it
                is permanently deleted from our systems.
              </p>
            </div>
          </div>

          {/* 8. Limitation of Liability */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              8. Limitation of Liability
            </h2>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, CAMPUSIQ AND ITS
                DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY
                INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
                DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA,
                USE, OR GOODWILL, ARISING OUT OF OR IN CONNECTION WITH YOUR USE
                OF THE SERVICE. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT
                PAID BY YOU FOR THE SERVICE IN THE 12 MONTHS PRECEDING THE
                CLAIM.
              </p>
            </div>
          </div>

          {/* 9. Governing Law */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              9. Governing Law & Dispute Resolution
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              These Terms are governed by and construed in accordance with the
              laws of India. Any disputes arising from or relating to these
              Terms or the Service shall be subject to the exclusive
              jurisdiction of the courts in Hyderabad, Telangana. Before
              pursuing legal action, both parties agree to attempt resolution
              through good-faith negotiation for a period of at least 30 days.
            </p>
          </div>

          {/* 10. Changes */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              10. Changes to These Terms
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              We reserve the right to update these Terms at any time. We will
              notify you of significant changes via email or an in-app
              notification at least 30 days before the changes take effect.
              Continued use of the Service after the effective date constitutes
              acceptance of the updated Terms.
            </p>
          </div>

          {/* Contact */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
              Questions?
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              If you have any questions about these Terms of Service, please
              contact us at{" "}
              <a
                href="mailto:legal@campusiq.in"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                legal@campusiq.in
              </a>{" "}
              or write to us at: CampusIQ Technologies Pvt. Ltd., Hitech City,
              Hyderabad, Telangana 500081, India.
            </p>
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
