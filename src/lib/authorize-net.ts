import { logRequest, logError } from "@/lib/logger";

// ─── Authorize.net Payment Integration ────────────────────────────────────────
// Uses the Authorize.net API (AIM/JSON) for real-time payment processing.
// Supports both Sandbox and Production environments.
// Uses direct credit card charging (server-to-server) — no Accept.js needed.

const API_LOGIN_ID = process.env.AUTHORIZE_NET_API_LOGIN_ID || "";
const TRANSACTION_KEY = process.env.AUTHORIZE_NET_TRANSACTION_KEY || "";
const IS_SANDBOX = process.env.AUTHORIZE_NET_SANDBOX !== "false";

const API_URL = IS_SANDBOX
  ? "https://apitest.authorize.net/xml/v1/request.api"
  : "https://api.authorize.net/xml/v1/request.api";

/** Whether real Authorize.net keys are configured */
export function isAuthorizeNetConfigured(): boolean {
  return !!(API_LOGIN_ID && TRANSACTION_KEY);
}

/** Get the API URL (exposed for testing) */
export function getApiUrl(): string {
  return API_URL;
}

/** Get whether we're in sandbox mode */
export function isSandboxMode(): boolean {
  return IS_SANDBOX;
}

// ─── Plan Prices (USD for Authorize.net) ─────────────────────────────────────
export const PLAN_PRICES_USD: Record<string, number> = {
  starter: 0,
  basic: 11.99,
  pro: 23.99,
  enterprise: 47.99,
};

export interface AuthorizeNetTransactionResult {
  success: boolean;
  transactionId: string;
  authCode: string;
  responseCode: string;
  messageCode: string;
  messageText: string;
  accountNumber: string; // masked card number
  accountType: string; // Visa, Mastercard, etc
  refId: string;
  errors?: string[];
}

/**
 * Normalize expiration date to YYYY-MM format.
 * Accepts MM/YY, MMYY, MM/YYYY, YYYY-MM formats.
 */
export function normalizeExpDate(input: string): string {
  // Already YYYY-MM format — pass through
  if (/^\d{4}-\d{2}$/.test(input)) {
    return input;
  }

  const clean = input.replace(/[^0-9]/g, "");
  if (clean.length === 4) {
    // MMYY → YYYY-MM
    const mm = clean.substring(0, 2);
    const yy = clean.substring(2, 4);
    const fullYear = parseInt(yy) > 50 ? `19${yy}` : `20${yy}`;
    return `${fullYear}-${mm}`;
  }
  if (clean.length === 6) {
    // MMYYYY → YYYY-MM
    const mm = clean.substring(0, 2);
    const yyyy = clean.substring(2, 6);
    return `${yyyy}-${mm}`;
  }
  return input;
}

/**
 * Charge a credit card directly via the Authorize.net API.
 * Card details are sent server-to-server over TLS — never stored.
 */
export async function chargeCard(params: {
  cardNumber: string;
  expirationDate: string; // MMYY or MM/YY or YYYY-MM format
  cardCode: string; // CVV
  amount: number;
  orderId: string;
  description: string;
  customerEmail: string;
  customerName?: string;
  invoiceNumber?: string;
  billingAddress?: {
    firstName: string;
    lastName: string;
    company?: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    country?: string;
    phone?: string;
  };
}): Promise<AuthorizeNetTransactionResult> {
  const {
    cardNumber,
    expirationDate,
    cardCode,
    amount,
    orderId,
    description,
    customerEmail,
    customerName,
    invoiceNumber,
    billingAddress,
  } = params;

  const refId = `ref_${Date.now()}`;

  // Normalize expiration date to YYYY-MM format for Authorize.net
  const expDate = normalizeExpDate(expirationDate);

  const requestBody = {
    createTransactionRequest: {
      merchantAuthentication: {
        name: API_LOGIN_ID,
        transactionKey: TRANSACTION_KEY,
      },
      refId,
      transactionRequest: {
        transactionType: "authCaptureTransaction",
        amount: amount.toFixed(2),
        payment: {
          creditCard: {
            cardNumber: cardNumber.replace(/\s+/g, ""),
            expirationDate: expDate,
            cardCode,
          },
        },
        order: {
          invoiceNumber: invoiceNumber || orderId.substring(0, 20),
          description: description.substring(0, 255),
        },
        customer: {
          email: customerEmail,
        },
        ...(billingAddress
          ? {
              billTo: {
                firstName:
                  billingAddress.firstName || customerName?.split(" ")[0] || "",
                lastName:
                  billingAddress.lastName ||
                  customerName?.split(" ").slice(1).join(" ") ||
                  "",
                company: billingAddress.company || "",
                address: billingAddress.address || "",
                city: billingAddress.city || "",
                state: billingAddress.state || "",
                zip: billingAddress.zip || "",
                country: billingAddress.country || "US",
                phoneNumber: billingAddress.phone || "",
              },
            }
          : customerName
            ? {
                billTo: {
                  firstName: customerName.split(" ")[0] || customerName,
                  lastName: customerName.split(" ").slice(1).join(" ") || "",
                },
              }
            : {}),
        transactionSettings: {
          setting: [
            {
              settingName: "duplicateWindow",
              settingValue: "120",
            },
            {
              settingName: "emailCustomer",
              settingValue: "false", // We send our own styled email
            },
          ],
        },
      },
    },
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    // Authorize.net wraps everything in transactionResponse
    const txnResponse = result?.transactionResponse;
    const messages = result?.messages;

    if (
      messages?.resultCode === "Ok" &&
      txnResponse &&
      (txnResponse.responseCode === "1" || txnResponse.responseCode === 1)
    ) {
      const txnResult: AuthorizeNetTransactionResult = {
        success: true,
        transactionId: txnResponse.transId || "",
        authCode: txnResponse.authCode || "",
        responseCode: String(txnResponse.responseCode),
        messageCode: txnResponse.messages?.[0]?.code || "",
        messageText: txnResponse.messages?.[0]?.description || "Approved",
        accountNumber: txnResponse.accountNumber || "",
        accountType: txnResponse.accountType || "",
        refId,
      };

      logRequest("POST", "/authorize-net/charge", undefined, undefined, {
        transactionId: txnResult.transactionId,
        amount,
        responseCode: txnResult.responseCode,
      });

      return txnResult;
    }

    // Transaction failed
    const errors: string[] = [];
    if (txnResponse?.errors) {
      for (const err of txnResponse.errors) {
        errors.push(err.errorText || `Error ${err.errorCode}`);
      }
    }
    if (messages?.message) {
      for (const msg of messages.message) {
        if (msg.code !== "I00001") {
          errors.push(msg.text || `Code ${msg.code}`);
        }
      }
    }

    const txnResult: AuthorizeNetTransactionResult = {
      success: false,
      transactionId: txnResponse?.transId || "",
      authCode: txnResponse?.authCode || "",
      responseCode: String(txnResponse?.responseCode || "0"),
      messageCode:
        txnResponse?.errors?.[0]?.errorCode ||
        messages?.message?.[0]?.code ||
        "",
      messageText: errors[0] || "Transaction declined",
      accountNumber: txnResponse?.accountNumber || "",
      accountType: txnResponse?.accountType || "",
      refId,
      errors,
    };

    logRequest("POST", "/authorize-net/charge", undefined, undefined, {
      failed: true,
      errors,
      responseCode: txnResult.responseCode,
    });

    return txnResult;
  } catch (err) {
    logError("POST", "/authorize-net/charge", err);
    return {
      success: false,
      transactionId: "",
      authCode: "",
      responseCode: "0",
      messageCode: "E00001",
      messageText:
        err instanceof Error ? err.message : "Network error occurred",
      accountNumber: "",
      accountType: "",
      refId,
      errors: [err instanceof Error ? err.message : "Network error"],
    };
  }
}

/**
 * Get transaction details from Authorize.net (for receipt verification).
 */
export async function getTransactionDetails(transactionId: string) {
  const requestBody = {
    getTransactionDetailsRequest: {
      merchantAuthentication: {
        name: API_LOGIN_ID,
        transactionKey: TRANSACTION_KEY,
      },
      transId: transactionId,
    },
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    return await response.json();
  } catch (err) {
    logError("POST", "/authorize-net/get-details", err);
    return null;
  }
}

/**
 * Issue a refund for a previous transaction.
 */
export async function refundTransaction(params: {
  transactionId: string;
  amount: number;
  lastFourDigits: string;
}): Promise<AuthorizeNetTransactionResult> {
  const requestBody = {
    createTransactionRequest: {
      merchantAuthentication: {
        name: API_LOGIN_ID,
        transactionKey: TRANSACTION_KEY,
      },
      refId: `refund_${Date.now()}`,
      transactionRequest: {
        transactionType: "refundTransaction",
        amount: params.amount.toFixed(2),
        payment: {
          creditCard: {
            cardNumber: params.lastFourDigits,
            expirationDate: "XXXX",
          },
        },
        refTransId: params.transactionId,
      },
    },
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();
    const txnResponse = result?.transactionResponse;
    const messages = result?.messages;

    return {
      success:
        messages?.resultCode === "Ok" && txnResponse?.responseCode === "1",
      transactionId: txnResponse?.transId || "",
      authCode: txnResponse?.authCode || "",
      responseCode: String(txnResponse?.responseCode || "0"),
      messageCode: txnResponse?.messages?.[0]?.code || "",
      messageText:
        txnResponse?.messages?.[0]?.description || "Refund processed",
      accountNumber: txnResponse?.accountNumber || "",
      accountType: txnResponse?.accountType || "",
      refId: `refund_${Date.now()}`,
    };
  } catch (err) {
    logError("POST", "/authorize-net/refund", err);
    return {
      success: false,
      transactionId: "",
      authCode: "",
      responseCode: "0",
      messageCode: "E00001",
      messageText: "Refund failed",
      accountNumber: "",
      accountType: "",
      refId: "",
      errors: [err instanceof Error ? err.message : "Network error"],
    };
  }
}
