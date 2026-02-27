"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showSuccess, showError } from "@/lib/alerts";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationToggle() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkSubscription = useCallback(async () => {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setIsSupported(false);
        setLoading(false);
        return;
      }
      setIsSupported(true);

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch {
      setIsSupported(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  const subscribe = async () => {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        showError(
          "Notification permission denied. Please enable it in browser settings.",
        );
        setLoading(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!vapidKey) {
        showError(
          "Push notifications are not configured. Contact your administrator.",
        );
        setLoading(false);
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisuallyIndicatedPermission: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      } as PushSubscriptionOptionsInit);

      // Save subscription to server
      const res = await fetch("/api/push-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent,
        }),
      });

      if (!res.ok) throw new Error("Failed to save subscription");

      setIsSubscribed(true);
      showSuccess("Push notifications enabled!");
    } catch (err) {
      console.error("Subscribe error:", err);
      showError("Failed to enable push notifications");
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Remove from server first
        await fetch("/api/push-subscription", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });

        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
      showSuccess("Push notifications disabled");
    } catch (err) {
      console.error("Unsubscribe error:", err);
      showError("Failed to disable push notifications");
    } finally {
      setLoading(false);
    }
  };

  if (!isSupported) return null;

  return (
    <Button
      variant={isSubscribed ? "default" : "outline"}
      size="sm"
      onClick={isSubscribed ? unsubscribe : subscribe}
      disabled={loading}
      className="gap-2"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isSubscribed ? (
        <Bell className="h-4 w-4" />
      ) : (
        <BellOff className="h-4 w-4" />
      )}
      {isSubscribed ? "Notifications On" : "Enable Notifications"}
    </Button>
  );
}
