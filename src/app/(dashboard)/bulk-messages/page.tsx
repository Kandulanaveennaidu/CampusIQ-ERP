"use client";

import { useState } from "react";
import {
  Megaphone,
  Send,
  Mail,
  Phone,
  Users,
  GraduationCap,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { showError, showSuccess } from "@/lib/alerts";
import { usePermissions } from "@/hooks/use-permissions";
import { useClasses } from "@/hooks/use-classes";

export default function BulkMessagesPage() {
  const { canAdd } = usePermissions("notifications");
  const { classes, classLabel } = useClasses();
  const [sending, setSending] = useState(false);
  const [channel, setChannel] = useState<"sms" | "email" | "both">("email");
  const [targetType, setTargetType] = useState<string>("all_students");
  const [targetClass, setTargetClass] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<{
    total_recipients: number;
    sms_sent: number;
    sms_failed: number;
    email_sent: number;
    email_failed: number;
  } | null>(null);

  const handleSend = async () => {
    if (!message.trim()) {
      showError("Error", "Please enter a message");
      return;
    }
    if ((channel === "email" || channel === "both") && !subject.trim()) {
      showError("Error", "Please enter a subject for email");
      return;
    }
    if (targetType === "class" && !targetClass) {
      showError("Error", "Please select a class");
      return;
    }

    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/bulk-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          target_type: targetType,
          target_value: targetType === "class" ? targetClass : undefined,
          subject: subject || undefined,
          message,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data.data);
        showSuccess("Sent!", data.message);
      } else {
        showError("Error", data.error || "Failed to send messages");
      }
    } catch {
      showError("Error", "Failed to send messages");
    } finally {
      setSending(false);
    }
  };

  if (!canAdd) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-slate-500">
          You don&apos;t have permission to send bulk messages.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Bulk Messages</h1>
        <p className="text-slate-500">
          Send SMS and email broadcasts to students, parents, or teachers
        </p>
      </div>

      {/* Quick Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-blue-100 p-2">
              <Mail className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold">Email</p>
              <p className="text-xs text-slate-500">
                Send rich HTML emails to recipients
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-green-100 p-2">
              <Phone className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold">SMS</p>
              <p className="text-xs text-slate-500">
                Send text messages via Twilio
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-purple-100 p-2">
              <Megaphone className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="font-semibold">Both</p>
              <p className="text-xs text-slate-500">
                Send via both SMS and email simultaneously
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compose Form */}
      <Card>
        <CardHeader>
          <CardTitle>Compose Message</CardTitle>
          <CardDescription>
            Use {"{name}"} in your message to personalize each recipient&apos;s
            name
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Channel & Target */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Channel</label>
              <Select
                value={channel}
                onValueChange={(v) => setChannel(v as "sms" | "email" | "both")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">
                    <span className="flex items-center gap-2">
                      <Mail className="h-3 w-3" /> Email Only
                    </span>
                  </SelectItem>
                  <SelectItem value="sms">
                    <span className="flex items-center gap-2">
                      <Phone className="h-3 w-3" /> SMS Only
                    </span>
                  </SelectItem>
                  <SelectItem value="both">
                    <span className="flex items-center gap-2">
                      <Megaphone className="h-3 w-3" /> Both
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Recipients</label>
              <Select value={targetType} onValueChange={setTargetType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_students">
                    <span className="flex items-center gap-2">
                      <GraduationCap className="h-3 w-3" /> All Student Parents
                    </span>
                  </SelectItem>
                  <SelectItem value="all_teachers">
                    <span className="flex items-center gap-2">
                      <BookOpen className="h-3 w-3" /> All Teachers
                    </span>
                  </SelectItem>
                  <SelectItem value="class">
                    <span className="flex items-center gap-2">
                      <Users className="h-3 w-3" /> Specific Class
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {targetType === "class" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{classLabel}</label>
                <Select value={targetClass} onValueChange={setTargetClass}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={`Select ${classLabel.toLowerCase()}`}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Subject (for email) */}
          {(channel === "email" || channel === "both") && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Subject</label>
              <Input
                placeholder="e.g. Important Notice from Administration"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
          )}

          {/* Message */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Message</label>
            <textarea
              className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder={`Dear {name},\n\nYour message here...\n\nRegards,\nAdministration`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <p className="text-xs text-slate-500">
              Tip: Use {"{name}"} to auto-insert each recipient&apos;s name
            </p>
          </div>

          {/* Send Button */}
          <div className="flex justify-end">
            <Button
              size="lg"
              onClick={handleSend}
              disabled={sending || !message.trim()}
            >
              {sending ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Broadcast
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="text-green-800">Delivery Report</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              <div className="text-center">
                <p className="text-2xl font-bold">{result.total_recipients}</p>
                <p className="text-xs text-slate-500">Total Recipients</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {result.email_sent}
                </p>
                <p className="text-xs text-slate-500">Emails Sent</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">
                  {result.email_failed}
                </p>
                <p className="text-xs text-slate-500">Emails Failed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {result.sms_sent}
                </p>
                <p className="text-xs text-slate-500">SMS Sent</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">
                  {result.sms_failed}
                </p>
                <p className="text-xs text-slate-500">SMS Failed</p>
              </div>
            </div>
            <div className="mt-4 flex justify-center gap-2">
              {result.email_sent > 0 && (
                <Badge variant="success">
                  {result.email_sent} emails delivered
                </Badge>
              )}
              {result.sms_sent > 0 && (
                <Badge variant="success">{result.sms_sent} SMS delivered</Badge>
              )}
              {(result.email_failed > 0 || result.sms_failed > 0) && (
                <Badge variant="destructive">
                  {result.email_failed + result.sms_failed} failed
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
