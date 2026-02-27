"use client";

import Link from "next/link";
import {
  ArrowLeft,
  GraduationCap,
  Clock,
  ArrowRight,
  Tag,
  TrendingUp,
  BookOpen,
  Lightbulb,
  BarChart3,
  Shield,
} from "lucide-react";

const featuredPost = {
  title: "How Digital Attendance Systems Are Reducing Absenteeism by 30%",
  excerpt:
    "Institutions across India are adopting QR-based and biometric attendance tracking to improve student presence rates. We dive into the data behind this transformation and share real case studies from CampusIQ partner institutions.",
  category: "Case Study",
  author: "Priya Sharma",
  date: "February 5, 2026",
  readTime: "8 min read",
  image: "📊",
};

const posts = [
  {
    title: "5 Ways to Streamline Fee Collection in Your Institution",
    excerpt:
      "Manual fee collection creates bottlenecks and errors. Learn how automated fee management can save your admin team hours every week while ensuring zero revenue leakage.",
    category: "Best Practices",
    author: "Amit Patel",
    date: "January 28, 2026",
    readTime: "5 min read",
    icon: TrendingUp,
  },
  {
    title: "The Complete Guide to Academic Year Planning",
    excerpt:
      "From semester setup to exam scheduling, this comprehensive guide walks you through every step of planning a successful academic year using CampusIQ.",
    category: "Guides",
    author: "Rajesh Kumar",
    date: "January 20, 2026",
    readTime: "12 min read",
    icon: BookOpen,
  },
  {
    title: "Why Institutions Need Role-Based Access Control",
    excerpt:
      "Not every staff member needs access to every feature. Discover how implementing RBAC can improve data security and reduce human errors in your institution.",
    category: "Security",
    author: "Sneha Reddy",
    date: "January 14, 2026",
    readTime: "6 min read",
    icon: Shield,
  },
  {
    title: "Using Data Analytics to Improve Student Performance",
    excerpt:
      "CampusIQ's reporting module helps identify at-risk students early. Learn how institutions are using attendance and exam data correlations to intervene proactively.",
    category: "Analytics",
    author: "Priya Sharma",
    date: "January 7, 2026",
    readTime: "7 min read",
    icon: BarChart3,
  },
  {
    title: "Top 10 Features Institutions Love About CampusIQ",
    excerpt:
      "From timetable auto-generation to bulk SMS notifications, here are the features our users can't live without — as voted by 200+ institution administrators.",
    category: "Product",
    author: "Amit Patel",
    date: "December 30, 2025",
    readTime: "4 min read",
    icon: Lightbulb,
  },
  {
    title: "Managing Multi-Branch Institutions Under One Platform",
    excerpt:
      "Operating multiple campuses? Learn how CampusIQ's multi-tenant architecture helps institution chains maintain consistency while allowing branch-level autonomy.",
    category: "Enterprise",
    author: "Rajesh Kumar",
    date: "December 22, 2025",
    readTime: "9 min read",
    icon: TrendingUp,
  },
];

const categories = [
  "All",
  "Case Study",
  "Best Practices",
  "Guides",
  "Security",
  "Analytics",
  "Product",
  "Enterprise",
];

export default function BlogPage() {
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
            CampusIQ Blog
          </h1>
          <p className="mt-6 text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Insights, guides, and best practices for modern institution
            management. Stay updated with the latest in education technology.
          </p>
        </div>
      </section>

      {/* Categories */}
      <section className="border-b border-gray-200 dark:border-gray-800 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  cat === "All"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Post */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-6">
            Featured Article
          </h2>
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-8 sm:p-12">
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-flex items-center gap-1 bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  <Tag className="h-3 w-3" />
                  {featuredPost.category}
                </span>
                <span className="inline-flex items-center gap-1 text-blue-100 text-xs">
                  <Clock className="h-3 w-3" />
                  {featuredPost.readTime}
                </span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4 leading-tight">
                {featuredPost.title}
              </h3>
              <p className="text-blue-100 leading-relaxed mb-6 max-w-3xl">
                {featuredPost.excerpt}
              </p>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="text-sm text-blue-200">
                  By{" "}
                  <span className="text-white font-medium">
                    {featuredPost.author}
                  </span>{" "}
                  · {featuredPost.date}
                </div>
                <button className="inline-flex items-center gap-2 bg-white text-blue-600 font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-50 transition-colors text-sm">
                  Read Article
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Post Grid */}
      <section className="py-12 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
            Latest Articles
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <article
                key={post.title}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow group"
              >
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30">
                      <post.icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                      {post.category}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
                    {post.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4 line-clamp-3">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <span>{post.author}</span>
                    <div className="flex items-center gap-3">
                      <span>{post.date}</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {post.readTime}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Load More */}
          <div className="text-center mt-12">
            <button className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Load More Articles
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Subscribe to Our Newsletter
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Get the latest articles, product updates, and institution management
            tips delivered to your inbox every week.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <button className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap">
              Subscribe
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">
            No spam. Unsubscribe at any time.
          </p>
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
