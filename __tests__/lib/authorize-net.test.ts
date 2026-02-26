/**
 * Comprehensive unit tests for the Authorize.net payment system.
 *
 * Tests cover:
 *  - normalizeExpDate() helper
 *  - isAuthorizeNetConfigured()
 *  - isSandboxMode()
 *  - getApiUrl()
 *  - PLAN_PRICES_USD
 *  - chargeCard() — success, decline, network error
 *  - getTransactionDetails()
 *  - refundTransaction()
 */

// ── Mocks ────────────────────────────────────────────────────────────────────

// Mock the logger so we don't hit real logging
jest.mock("@/lib/logger", () => ({
  logRequest: jest.fn(),
  logError: jest.fn(),
}));

// We need to control env vars for each test, so we'll use resetModules
const ORIGINAL_ENV = process.env;

beforeEach(() => {
  jest.resetModules();
  // Clone env so tests don't bleed into each other
  process.env = { ...ORIGINAL_ENV };
  // Set default sandbox credentials
  process.env.AUTHORIZE_NET_API_LOGIN_ID = "testLoginId";
  process.env.AUTHORIZE_NET_TRANSACTION_KEY = "testTransKey";
  process.env.AUTHORIZE_NET_SANDBOX = "true";
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

// We use a helper to dynamically import so env changes take effect
async function loadModule() {
  return await import("@/lib/authorize-net");
}

// ─── normalizeExpDate ────────────────────────────────────────────────────────

describe("normalizeExpDate", () => {
  let normalizeExpDate: (input: string) => string;

  beforeEach(async () => {
    const mod = await loadModule();
    normalizeExpDate = mod.normalizeExpDate;
  });

  it("converts MMYY (4 digits) to YYYY-MM", () => {
    expect(normalizeExpDate("1225")).toBe("2025-12");
    expect(normalizeExpDate("0130")).toBe("2030-01");
    expect(normalizeExpDate("0699")).toBe("1999-06"); // >50 → 19xx
  });

  it("converts MMYYYY (6 digits) to YYYY-MM", () => {
    expect(normalizeExpDate("122025")).toBe("2025-12");
    expect(normalizeExpDate("012030")).toBe("2030-01");
  });

  it("converts MM/YY to YYYY-MM (strips slash)", () => {
    expect(normalizeExpDate("12/25")).toBe("2025-12");
    expect(normalizeExpDate("01/30")).toBe("2030-01");
  });

  it("converts MM/YYYY to YYYY-MM (strips slash)", () => {
    expect(normalizeExpDate("12/2025")).toBe("2025-12");
  });

  it("passes through YYYY-MM format unchanged", () => {
    expect(normalizeExpDate("2025-12")).toBe("2025-12");
    expect(normalizeExpDate("2030-01")).toBe("2030-01");
  });

  it("handles edge case: year 50 maps to 2050", () => {
    expect(normalizeExpDate("0150")).toBe("2050-01");
  });

  it("handles edge case: year 51 maps to 1951", () => {
    expect(normalizeExpDate("0151")).toBe("1951-01");
  });
});

// ─── isAuthorizeNetConfigured ────────────────────────────────────────────────

describe("isAuthorizeNetConfigured", () => {
  it("returns true when both API_LOGIN_ID and TRANSACTION_KEY are set", async () => {
    const mod = await loadModule();
    expect(mod.isAuthorizeNetConfigured()).toBe(true);
  });

  it("returns false when API_LOGIN_ID is missing", async () => {
    process.env.AUTHORIZE_NET_API_LOGIN_ID = "";
    const mod = await loadModule();
    expect(mod.isAuthorizeNetConfigured()).toBe(false);
  });

  it("returns false when TRANSACTION_KEY is missing", async () => {
    process.env.AUTHORIZE_NET_TRANSACTION_KEY = "";
    const mod = await loadModule();
    expect(mod.isAuthorizeNetConfigured()).toBe(false);
  });

  it("returns false when both are missing", async () => {
    delete process.env.AUTHORIZE_NET_API_LOGIN_ID;
    delete process.env.AUTHORIZE_NET_TRANSACTION_KEY;
    const mod = await loadModule();
    expect(mod.isAuthorizeNetConfigured()).toBe(false);
  });
});

// ─── isSandboxMode ───────────────────────────────────────────────────────────

describe("isSandboxMode", () => {
  it('returns true by default (AUTHORIZE_NET_SANDBOX != "false")', async () => {
    const mod = await loadModule();
    expect(mod.isSandboxMode()).toBe(true);
  });

  it('returns false when AUTHORIZE_NET_SANDBOX is "false"', async () => {
    process.env.AUTHORIZE_NET_SANDBOX = "false";
    const mod = await loadModule();
    expect(mod.isSandboxMode()).toBe(false);
  });

  it("returns true when env is undefined (defaults to sandbox)", async () => {
    delete process.env.AUTHORIZE_NET_SANDBOX;
    const mod = await loadModule();
    expect(mod.isSandboxMode()).toBe(true);
  });
});

// ─── getApiUrl ───────────────────────────────────────────────────────────────

describe("getApiUrl", () => {
  it("returns sandbox URL when in sandbox mode", async () => {
    const mod = await loadModule();
    expect(mod.getApiUrl()).toBe(
      "https://apitest.authorize.net/xml/v1/request.api",
    );
  });

  it("returns production URL when sandbox is false", async () => {
    process.env.AUTHORIZE_NET_SANDBOX = "false";
    const mod = await loadModule();
    expect(mod.getApiUrl()).toBe(
      "https://api.authorize.net/xml/v1/request.api",
    );
  });
});

// ─── PLAN_PRICES_USD ─────────────────────────────────────────────────────────

describe("PLAN_PRICES_USD", () => {
  it("has correct prices for all plans", async () => {
    const mod = await loadModule();
    expect(mod.PLAN_PRICES_USD).toEqual({
      starter: 0,
      basic: 11.99,
      pro: 23.99,
      enterprise: 47.99,
    });
  });

  it("starter plan is free ($0)", async () => {
    const mod = await loadModule();
    expect(mod.PLAN_PRICES_USD.starter).toBe(0);
  });

  it("all paid plans have positive prices", async () => {
    const mod = await loadModule();
    const paid = ["basic", "pro", "enterprise"];
    paid.forEach((p) => {
      expect(mod.PLAN_PRICES_USD[p]).toBeGreaterThan(0);
    });
  });

  it("plans are ordered by ascending price", async () => {
    const mod = await loadModule();
    const { starter, basic, pro, enterprise } = mod.PLAN_PRICES_USD;
    expect(starter).toBeLessThan(basic);
    expect(basic).toBeLessThan(pro);
    expect(pro).toBeLessThan(enterprise);
  });
});

// ─── chargeCard ──────────────────────────────────────────────────────────────

describe("chargeCard", () => {
  let chargeCard: typeof import("@/lib/authorize-net").chargeCard;

  const defaultParams = {
    cardNumber: "4111111111111111",
    expirationDate: "1225",
    cardCode: "123",
    amount: 23.99,
    orderId: "ord_test123",
    description: "CampusIQ Pro Plan — monthly subscription",
    customerEmail: "test@example.com",
    customerName: "John Doe",
    invoiceNumber: "INV-20250101-ABC12",
  };

  // Helper to create mock Authorize.net API responses
  function mockFetchResponse(body: object) {
    (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      json: () => Promise.resolve(body),
    });
  }

  beforeEach(async () => {
    const mod = await loadModule();
    chargeCard = mod.chargeCard;
  });

  it("returns success result for approved transaction", async () => {
    mockFetchResponse({
      messages: {
        resultCode: "Ok",
        message: [{ code: "I00001", text: "Successful." }],
      },
      transactionResponse: {
        responseCode: "1",
        transId: "60123456789",
        authCode: "ABCD12",
        messages: [
          { code: "1", description: "This transaction has been approved." },
        ],
        accountNumber: "XXXX1111",
        accountType: "Visa",
      },
    });

    const result = await chargeCard(defaultParams);

    expect(result.success).toBe(true);
    expect(result.transactionId).toBe("60123456789");
    expect(result.authCode).toBe("ABCD12");
    expect(result.responseCode).toBe("1");
    expect(result.accountNumber).toBe("XXXX1111");
    expect(result.accountType).toBe("Visa");
    expect(result.messageText).toBe("This transaction has been approved.");
    expect(result.refId).toMatch(/^ref_\d+$/);
  });

  it("sends correct request body to Authorize.net API", async () => {
    mockFetchResponse({
      messages: {
        resultCode: "Ok",
        message: [{ code: "I00001", text: "Successful." }],
      },
      transactionResponse: {
        responseCode: "1",
        transId: "123",
        authCode: "ABC",
        messages: [{ code: "1", description: "Approved" }],
        accountNumber: "XXXX1111",
        accountType: "Visa",
      },
    });

    await chargeCard(defaultParams);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe("https://apitest.authorize.net/xml/v1/request.api");
    expect(opts.method).toBe("POST");
    expect(opts.headers["Content-Type"]).toBe("application/json");

    const body = JSON.parse(opts.body);
    const txn = body.createTransactionRequest;

    // Merchant auth
    expect(txn.merchantAuthentication.name).toBe("testLoginId");
    expect(txn.merchantAuthentication.transactionKey).toBe("testTransKey");

    // Transaction details
    expect(txn.transactionRequest.transactionType).toBe(
      "authCaptureTransaction",
    );
    expect(txn.transactionRequest.amount).toBe("23.99");

    // Credit card (should be normalized)
    const card = txn.transactionRequest.payment.creditCard;
    expect(card.cardNumber).toBe("4111111111111111");
    expect(card.cardCode).toBe("123");

    // Order
    expect(txn.transactionRequest.order.invoiceNumber).toBe(
      "INV-20250101-ABC12",
    );

    // Customer
    expect(txn.transactionRequest.customer.email).toBe("test@example.com");

    // Billing name
    expect(txn.transactionRequest.billTo.firstName).toBe("John");
    expect(txn.transactionRequest.billTo.lastName).toBe("Doe");
  });

  it("strips spaces from card number", async () => {
    mockFetchResponse({
      messages: { resultCode: "Ok", message: [{ code: "I00001", text: "Ok" }] },
      transactionResponse: {
        responseCode: "1",
        transId: "123",
        authCode: "ABC",
        messages: [{ code: "1", description: "Approved" }],
        accountNumber: "XXXX1111",
        accountType: "Visa",
      },
    });

    await chargeCard({
      ...defaultParams,
      cardNumber: "4111 1111 1111 1111",
    });

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(
      body.createTransactionRequest.transactionRequest.payment.creditCard
        .cardNumber,
    ).toBe("4111111111111111");
  });

  it("normalizes expiration date (MMYY → YYYY-MM)", async () => {
    mockFetchResponse({
      messages: { resultCode: "Ok", message: [{ code: "I00001", text: "Ok" }] },
      transactionResponse: {
        responseCode: "1",
        transId: "123",
        authCode: "ABC",
        messages: [{ code: "1", description: "Approved" }],
        accountNumber: "XXXX1111",
        accountType: "Visa",
      },
    });

    await chargeCard({ ...defaultParams, expirationDate: "1225" });

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(
      body.createTransactionRequest.transactionRequest.payment.creditCard
        .expirationDate,
    ).toBe("2025-12");
  });

  it("omits billTo when customerName is not provided", async () => {
    mockFetchResponse({
      messages: { resultCode: "Ok", message: [{ code: "I00001", text: "Ok" }] },
      transactionResponse: {
        responseCode: "1",
        transId: "123",
        authCode: "ABC",
        messages: [{ code: "1", description: "Approved" }],
        accountNumber: "XXXX1111",
        accountType: "Visa",
      },
    });

    await chargeCard({
      ...defaultParams,
      customerName: undefined,
    });

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(
      body.createTransactionRequest.transactionRequest.billTo,
    ).toBeUndefined();
  });

  it("returns failure result for declined transaction", async () => {
    mockFetchResponse({
      messages: {
        resultCode: "Error",
        message: [
          { code: "E00027", text: "The transaction was unsuccessful." },
        ],
      },
      transactionResponse: {
        responseCode: "2",
        transId: "0",
        authCode: "",
        errors: [
          { errorCode: "2", errorText: "This transaction has been declined." },
        ],
        accountNumber: "XXXX1111",
        accountType: "Visa",
      },
    });

    const result = await chargeCard(defaultParams);

    expect(result.success).toBe(false);
    expect(result.responseCode).toBe("2");
    expect(result.errors).toContain("This transaction has been declined.");
    expect(result.messageText).toBe("This transaction has been declined.");
  });

  it("returns failure result when resultCode is Error even with responseCode 1", async () => {
    // Edge case: messages say Error but transactionResponse has code 1
    // Our code requires BOTH messages.resultCode === "Ok" AND responseCode === "1"
    mockFetchResponse({
      messages: {
        resultCode: "Error",
        message: [
          {
            code: "E00039",
            text: "A duplicate transaction has been submitted.",
          },
        ],
      },
      transactionResponse: {
        responseCode: "1",
        transId: "60123456789",
        authCode: "ABCD12",
        messages: [{ code: "1", description: "Approved" }],
        accountNumber: "XXXX1111",
        accountType: "Visa",
      },
    });

    const result = await chargeCard(defaultParams);
    // Because resultCode !== "Ok", this should be treated as failure
    expect(result.success).toBe(false);
  });

  it("handles network error gracefully", async () => {
    (global.fetch as jest.Mock) = jest
      .fn()
      .mockRejectedValue(new Error("Network timeout"));

    const result = await chargeCard(defaultParams);

    expect(result.success).toBe(false);
    expect(result.transactionId).toBe("");
    expect(result.messageCode).toBe("E00001");
    expect(result.messageText).toBe("Network timeout");
    expect(result.errors).toContain("Network timeout");
  });

  it("handles non-Error throw gracefully", async () => {
    (global.fetch as jest.Mock) = jest.fn().mockRejectedValue("unknown error");

    const result = await chargeCard(defaultParams);

    expect(result.success).toBe(false);
    expect(result.messageText).toBe("Network error occurred");
    expect(result.errors).toContain("Network error");
  });

  it("handles null/missing transactionResponse", async () => {
    mockFetchResponse({
      messages: {
        resultCode: "Error",
        message: [{ code: "E00003", text: "Invalid value" }],
      },
    });

    const result = await chargeCard(defaultParams);

    expect(result.success).toBe(false);
    expect(result.responseCode).toBe("0");
    expect(result.errors).toContain("Invalid value");
  });

  it("formats amount to 2 decimal places", async () => {
    mockFetchResponse({
      messages: { resultCode: "Ok", message: [{ code: "I00001", text: "Ok" }] },
      transactionResponse: {
        responseCode: "1",
        transId: "123",
        authCode: "ABC",
        messages: [{ code: "1", description: "Approved" }],
        accountNumber: "XXXX1111",
        accountType: "Visa",
      },
    });

    await chargeCard({ ...defaultParams, amount: 11.9 });

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.createTransactionRequest.transactionRequest.amount).toBe(
      "11.90",
    );
  });

  it("truncates description to 255 characters", async () => {
    mockFetchResponse({
      messages: { resultCode: "Ok", message: [{ code: "I00001", text: "Ok" }] },
      transactionResponse: {
        responseCode: "1",
        transId: "123",
        authCode: "ABC",
        messages: [{ code: "1", description: "Approved" }],
        accountNumber: "XXXX1111",
        accountType: "Visa",
      },
    });

    const longDesc = "A".repeat(300);
    await chargeCard({ ...defaultParams, description: longDesc });

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(
      body.createTransactionRequest.transactionRequest.order.description.length,
    ).toBe(255);
  });

  it("truncates invoiceNumber from orderId to 20 chars when not provided", async () => {
    mockFetchResponse({
      messages: { resultCode: "Ok", message: [{ code: "I00001", text: "Ok" }] },
      transactionResponse: {
        responseCode: "1",
        transId: "123",
        authCode: "ABC",
        messages: [{ code: "1", description: "Approved" }],
        accountNumber: "XXXX1111",
        accountType: "Visa",
      },
    });

    const longOrderId = "ord_" + "x".repeat(50);
    await chargeCard({
      ...defaultParams,
      orderId: longOrderId,
      invoiceNumber: undefined,
    });

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(
      body.createTransactionRequest.transactionRequest.order.invoiceNumber
        .length,
    ).toBe(20);
  });

  it("sets duplicate window to 120 seconds", async () => {
    mockFetchResponse({
      messages: { resultCode: "Ok", message: [{ code: "I00001", text: "Ok" }] },
      transactionResponse: {
        responseCode: "1",
        transId: "123",
        authCode: "ABC",
        messages: [{ code: "1", description: "Approved" }],
        accountNumber: "XXXX1111",
        accountType: "Visa",
      },
    });

    await chargeCard(defaultParams);

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    const settings =
      body.createTransactionRequest.transactionRequest.transactionSettings
        .setting;
    const dupWindow = settings.find(
      (s: { settingName: string }) => s.settingName === "duplicateWindow",
    );
    expect(dupWindow.settingValue).toBe("120");
  });

  it("disables Authorize.net customer emails (we send our own)", async () => {
    mockFetchResponse({
      messages: { resultCode: "Ok", message: [{ code: "I00001", text: "Ok" }] },
      transactionResponse: {
        responseCode: "1",
        transId: "123",
        authCode: "ABC",
        messages: [{ code: "1", description: "Approved" }],
        accountNumber: "XXXX1111",
        accountType: "Visa",
      },
    });

    await chargeCard(defaultParams);

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    const settings =
      body.createTransactionRequest.transactionRequest.transactionSettings
        .setting;
    const emailSetting = settings.find(
      (s: { settingName: string }) => s.settingName === "emailCustomer",
    );
    expect(emailSetting.settingValue).toBe("false");
  });

  it("handles integer responseCode (1 instead of '1')", async () => {
    mockFetchResponse({
      messages: { resultCode: "Ok", message: [{ code: "I00001", text: "Ok" }] },
      transactionResponse: {
        responseCode: 1, // integer, not string
        transId: "60123456789",
        authCode: "ABCD12",
        messages: [{ code: "1", description: "Approved" }],
        accountNumber: "XXXX1111",
        accountType: "Visa",
      },
    });

    const result = await chargeCard(defaultParams);
    expect(result.success).toBe(true);
  });
});

// ─── getTransactionDetails ───────────────────────────────────────────────────

describe("getTransactionDetails", () => {
  let getTransactionDetails: typeof import("@/lib/authorize-net").getTransactionDetails;

  beforeEach(async () => {
    const mod = await loadModule();
    getTransactionDetails = mod.getTransactionDetails;
  });

  it("sends correct request body with transactionId", async () => {
    (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          messages: { resultCode: "Ok" },
          transaction: { transId: "60123456789" },
        }),
    });

    const result = await getTransactionDetails("60123456789");

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.getTransactionDetailsRequest.transId).toBe("60123456789");
    expect(body.getTransactionDetailsRequest.merchantAuthentication.name).toBe(
      "testLoginId",
    );
    expect(result).toHaveProperty("messages");
    expect(result).toHaveProperty("transaction");
  });

  it("returns null on network error", async () => {
    (global.fetch as jest.Mock) = jest
      .fn()
      .mockRejectedValue(new Error("Network error"));

    const result = await getTransactionDetails("12345");
    expect(result).toBeNull();
  });
});

// ─── refundTransaction ───────────────────────────────────────────────────────

describe("refundTransaction", () => {
  let refundTransaction: typeof import("@/lib/authorize-net").refundTransaction;

  beforeEach(async () => {
    const mod = await loadModule();
    refundTransaction = mod.refundTransaction;
  });

  it("sends correct refund request body", async () => {
    (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          messages: { resultCode: "Ok" },
          transactionResponse: {
            responseCode: "1",
            transId: "refund123",
            authCode: "",
            messages: [{ code: "1", description: "Refund processed" }],
            accountNumber: "XXXX1111",
            accountType: "Visa",
          },
        }),
    });

    const result = await refundTransaction({
      transactionId: "60123456789",
      amount: 23.99,
      lastFourDigits: "1111",
    });

    expect(result.success).toBe(true);
    expect(result.transactionId).toBe("refund123");

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    const txn = body.createTransactionRequest.transactionRequest;
    expect(txn.transactionType).toBe("refundTransaction");
    expect(txn.amount).toBe("23.99");
    expect(txn.payment.creditCard.cardNumber).toBe("1111");
    expect(txn.payment.creditCard.expirationDate).toBe("XXXX");
    expect(txn.refTransId).toBe("60123456789");
  });

  it("returns failure on declined refund", async () => {
    (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          messages: { resultCode: "Error" },
          transactionResponse: {
            responseCode: "3",
            transId: "",
            errors: [
              {
                errorCode: "54",
                errorText:
                  "The referenced transaction does not meet the criteria for issuing a credit.",
              },
            ],
          },
        }),
    });

    const result = await refundTransaction({
      transactionId: "60123456789",
      amount: 23.99,
      lastFourDigits: "1111",
    });

    expect(result.success).toBe(false);
  });

  it("returns failure on network error", async () => {
    (global.fetch as jest.Mock) = jest
      .fn()
      .mockRejectedValue(new Error("Connection refused"));

    const result = await refundTransaction({
      transactionId: "12345",
      amount: 10,
      lastFourDigits: "1111",
    });

    expect(result.success).toBe(false);
    expect(result.messageText).toBe("Refund failed");
    expect(result.errors).toContain("Connection refused");
  });
});

// ─── AuthorizeNetTransactionResult interface ─────────────────────────────────

describe("AuthorizeNetTransactionResult shape", () => {
  it("chargeCard returns all expected fields on success", async () => {
    const mod = await loadModule();

    (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          messages: {
            resultCode: "Ok",
            message: [{ code: "I00001", text: "Ok" }],
          },
          transactionResponse: {
            responseCode: "1",
            transId: "TXN001",
            authCode: "AUTH01",
            messages: [{ code: "1", description: "Approved" }],
            accountNumber: "XXXX4242",
            accountType: "Mastercard",
          },
        }),
    });

    const result = await mod.chargeCard({
      cardNumber: "5424000000000015",
      expirationDate: "1225",
      cardCode: "999",
      amount: 47.99,
      orderId: "ord_shape_test",
      description: "Shape test",
      customerEmail: "shape@test.com",
    });

    // Verify all fields exist
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("transactionId");
    expect(result).toHaveProperty("authCode");
    expect(result).toHaveProperty("responseCode");
    expect(result).toHaveProperty("messageCode");
    expect(result).toHaveProperty("messageText");
    expect(result).toHaveProperty("accountNumber");
    expect(result).toHaveProperty("accountType");
    expect(result).toHaveProperty("refId");
    // Errors should be undefined on success
    expect(result.errors).toBeUndefined();
  });

  it("chargeCard returns errors array on failure", async () => {
    const mod = await loadModule();

    (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          messages: {
            resultCode: "Error",
            message: [{ code: "E00027", text: "Transaction failed" }],
          },
          transactionResponse: {
            responseCode: "2",
            errors: [
              { errorCode: "2", errorText: "Declined" },
              { errorCode: "3", errorText: "Pick up card" },
            ],
          },
        }),
    });

    const result = await mod.chargeCard({
      cardNumber: "4111111111111111",
      expirationDate: "1225",
      cardCode: "123",
      amount: 1.0,
      orderId: "ord_err_test",
      description: "Error shape test",
      customerEmail: "err@test.com",
    });

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThanOrEqual(2);
    expect(result.errors).toContain("Declined");
    expect(result.errors).toContain("Pick up card");
  });
});
