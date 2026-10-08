const SANDBOX_BASE = "https://sandbox.safaricom.co.ke";

export function paymentsEnabled(): boolean {
  return process.env.PAYMENTS_ENABLED === "true";
}

export function mpesaBaseUrl(): string {
  const configured = process.env.MPESA_BASE_URL;
  const base = configured || SANDBOX_BASE;
  if (!base.includes("sandbox.safaricom.co.ke")) {
    throw new Error("MPESA_BASE_URL must point at the Safaricom sandbox for this demo.");
  }
  return base.replace(/\/+$/, "");
}

export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (/^2547\d{8}$/.test(digits)) return digits;
  if (/^07\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  throw new Error("Enter a valid M-Pesa phone number.");
}

export async function paymentsAvailable(): Promise<boolean> {
  if (!paymentsEnabled()) return false;
  return Boolean(
    process.env.MPESA_CONSUMER_KEY &&
    process.env.MPESA_CONSUMER_SECRET &&
    process.env.MPESA_SHORTCODE &&
    process.env.MPESA_PASSKEY,
  );
}

async function accessToken(): Promise<string> {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  if (!key || !secret) throw new Error("MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET are required.");
  const response = await fetch(`${mpesaBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}` },
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error(`M-Pesa access token request failed (HTTP ${response.status}).`);
  const payload = (await response.json()) as { access_token?: string; errorCode?: string; errorMessage?: string };
  if (!payload.access_token) throw new Error(`M-Pesa access token request failed: ${payload.errorMessage ?? payload.errorCode ?? "unknown"}`);
  return payload.access_token;
}

function darajaTimestamp(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

export type StkPushResult = {
  checkoutRequestId: string;
  merchantRequestId: string;
  responseDescription: string;
};

export async function stkPush(input: { amount: string; phone: string; reference: string; callbackUrl: string }): Promise<StkPushResult> {
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  if (!shortcode || !passkey) throw new Error("MPESA_SHORTCODE and MPESA_PASSKEY are required.");
  const ts = darajaTimestamp();
  const password = Buffer.from(shortcode + passkey + ts).toString("base64");
  const token = await accessToken();
  const response = await fetch(`${mpesaBaseUrl()}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: ts,
      TransactionType: "CustomerPayBillOnline",
      Amount: input.amount,
      PartyA: normalizePhone(input.phone),
      PartyB: shortcode,
      PhoneNumber: normalizePhone(input.phone),
      CallBackURL: input.callbackUrl,
      AccountReference: input.reference.slice(0, 12),
      TransactionDesc: "STRADES sandbox deposit",
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(6_000),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    MerchantRequestID?: string;
    CheckoutRequestID?: string;
    ResponseCode?: string;
    ResponseDescription?: string;
    errorMessage?: string;
  };
  if (!response.ok || payload.ResponseCode !== "0") {
    throw new Error(payload.ResponseDescription ?? payload.errorMessage ?? `M-Pesa STK push failed (HTTP ${response.status}).`);
  }
  if (!payload.CheckoutRequestID || !payload.MerchantRequestID) throw new Error("M-Pesa STK push returned no checkout reference.");
  return {
    checkoutRequestId: payload.CheckoutRequestID,
    merchantRequestId: payload.MerchantRequestID,
    responseDescription: payload.ResponseDescription ?? "",
  };
}

export type B2cResult = {
  originatorConversationId: string;
  responseDescription: string;
};

export async function b2cWithdrawal(input: { amount: string; phone: string; reference: string; resultUrl: string }): Promise<B2cResult> {
  const shortcode = process.env.MPESA_SHORTCODE;
  const initiatorName = process.env.MPESA_INITIATOR_NAME;
  const initiatorPassword = process.env.MPESA_INITIATOR_PASSWORD;
  if (!shortcode || !initiatorName || !initiatorPassword) {
    throw new Error("MPESA_INITIATOR_NAME and MPESA_INITIATOR_PASSWORD are required for withdrawals.");
  }
  const token = await accessToken();
  const response = await fetch(`${mpesaBaseUrl()}/mpesa/b2c/v1/paymentrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      InitiatorName: initiatorName,
      SecurityCredential: Buffer.from(initiatorPassword).toString("base64"),
      CommandID: "SalaryPayment",
      Amount: input.amount,
      PartyA: shortcode,
      PartyB: normalizePhone(input.phone),
      Remarks: "STRADES sandbox payout",
      QueueTimeOutURL: input.resultUrl,
      ResultURL: input.resultUrl,
      Occassion: "",
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(6_000),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    OriginatorConversationID?: string;
    ResponseCode?: string;
    ResponseDescription?: string;
    errorMessage?: string;
  };
  if (!response.ok || payload.ResponseCode !== "0") {
    throw new Error(payload.ResponseDescription ?? payload.errorMessage ?? `M-Pesa B2C request failed (HTTP ${response.status}).`);
  }
  if (!payload.OriginatorConversationID) throw new Error("M-Pesa B2C request returned no reference.");
  return {
    originatorConversationId: payload.OriginatorConversationID,
    responseDescription: payload.ResponseDescription ?? "",
  };
}

export function isSandboxMode(): boolean {
  return mpesaBaseUrl().includes("sandbox.safaricom.co.ke");
}