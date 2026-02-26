"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { SocketProvider } from "@/components/providers/socket-provider";
import { RealtimeNotifications } from "@/components/layout/realtime-notifications";
import AIChatbot from "@/components/ai-chatbot";

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <SocketProvider>
      <div className="min-h-screen bg-background text-foreground">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main content */}
        <div className="lg:pl-64">
          <Header onMenuClick={() => setSidebarOpen(true)} />

          <main className="p-4 lg:p-6">{children}</main>
        </div>

        {/* Real-time notification toasts */}
        <RealtimeNotifications />

        {/* AI Chatbot */}
        <AIChatbot />
      </div>
    </SocketProvider>
  );
}
