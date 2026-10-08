import { b2cWithdrawal, isSandboxMode, paymentsAvailable, stkPush } from "./daraja";

export type PaymentStatus =
  | "DEPOSIT_PENDING"
  | "DEPOSIT_SUCCESS"
  | "DEPOSIT_FAILED"
  | "WITHDRAWAL_PENDING"
  | "WITHDRAWAL_SUCCESS"
  | "WITHDRAWAL_FAILED";

export class PaymentUnavailableError extends Error {
  public readonly code = "PAYMENTS_DISABLED";
  constructor(message = "Payments are disabled in this demo release.") {
    super(message);
  }
}

export interface PaymentProvider {
  enabled(): boolean;
  initializeDeposit(input: { amount: string; phone: string; idempotencyKey: string }): Promise<{ reference: string; status: PaymentStatus; note: string }>;
  checkDepositStatus(reference: string): Promise<PaymentStatus>;
  requestWithdrawal(input: { amount: string; phone: string; idempotencyKey: string }): Promise<{ reference: string; status: PaymentStatus; note: string }>;
  checkWithdrawalStatus(reference: string): Promise<PaymentStatus>;
  handleWebhook(payload: unknown): Promise<{ reference: string; status: PaymentStatus; amount?: string }>;
}

export class MockPaymentProvider implements PaymentProvider {
  enabled(): boolean { return false; }
  async initializeDeposit(): Promise<{ reference: string; status: PaymentStatus; note: string }> {
    throw new PaymentUnavailableError();
  }
  async checkDepositStatus(): Promise<PaymentStatus> { return "DEPOSIT_FAILED"; }
  async requestWithdrawal(): Promise<{ reference: string; status: PaymentStatus; note: string }> {
    throw new PaymentUnavailableError("Real-money withdrawals are disabled.");
  }
  async checkWithdrawalStatus(): Promise<PaymentStatus> { return "WITHDRAWAL_FAILED"; }
  async handleWebhook(): Promise<{ reference: string; status: PaymentStatus }> {
    throw new PaymentUnavailableError("No payment webhook is configured.");
  }
}

export class MpesaDarajaProvider implements PaymentProvider {
  enabled(): boolean {
    return process.env.PAYMENTS_ENABLED === "true";
  }

  private assertUsable(): void {
    if (!this.enabled() || !isSandboxMode()) {
      throw new PaymentUnavailableError(
        "Real-money payments are disabled in this demo. Deposits only run against the Safaricom sandbox (no real funds).",
      );
    }
  }

  private callbackUrl(): string {
    const configured = process.env.MPESA_CALLBACK_URL;
    if (!configured) throw new Error("MPESA_CALLBACK_URL is required to receive M-Pesa callbacks.");
    return configured;
  }

  async initializeDeposit(input: { amount: string; phone: string; idempotencyKey: string }): Promise<{ reference: string; status: PaymentStatus; note: string }> {
    if (!await paymentsAvailable()) {
      throw new PaymentUnavailableError(
        "Sandbox M-Pesa is not configured. Set PAYMENTS_ENABLED=true and the MPESA_* sandbox keys to test deposits.",
      );
    }
    this.assertUsable();
    const result = await stkPush({
      amount: input.amount,
      phone: input.phone,
      reference: `dep-${input.idempotencyKey}`,
      callbackUrl: this.callbackUrl(),
    });
    return {
      reference: result.checkoutRequestId,
      status: "DEPOSIT_PENDING",
      note: `M-Pesa STK push sent to ${input.phone} (sandbox). Confirm the prompt on your phone to complete the deposit.`,
    };
  }

  async checkDepositStatus(): Promise<PaymentStatus> {
    return "DEPOSIT_PENDING";
  }

  async requestWithdrawal(input: { amount: string; phone: string; idempotencyKey: string }): Promise<{ reference: string; status: PaymentStatus; note: string }> {
    if (!await paymentsAvailable()) {
      throw new PaymentUnavailableError(
        "Sandbox M-Pesa is not configured. Set PAYMENTS_ENABLED=true and the MPESA_* sandbox keys to test withdrawals.",
      );
    }
    this.assertUsable();
    const resultUrl = process.env.MPESA_B2C_RESULT_URL;
    if (!resultUrl) throw new Error("MPESA_B2C_RESULT_URL is required to receive withdrawal results.");
    const result = await b2cWithdrawal({
      amount: input.amount,
      phone: input.phone,
      reference: `wdr-${input.idempotencyKey}`,
      resultUrl,
    });
    return {
      reference: result.originatorConversationId,
      status: "WITHDRAWAL_PENDING",
      note: `M-Pesa payout request sent to ${input.phone} (sandbox). Funds are virtual and will move only on a successful sandbox result.`,
    };
  }

  async checkWithdrawalStatus(): Promise<PaymentStatus> {
    return "WITHDRAWAL_PENDING";
  }

  async handleWebhook(payload: unknown): Promise<{ reference: string; status: PaymentStatus; amount?: string }> {
    if (!this.enabled() || !isSandboxMode()) throw new PaymentUnavailableError();
    if (typeof payload !== "object" || payload === null) throw new Error("Invalid M-Pesa callback payload.");
    const root = payload as Record<string, unknown>;

    const stk = (root.Body as { stkCallback?: { CheckoutRequestID?: unknown; ResultCode?: unknown; CallbackMetadata?: unknown } } | undefined)?.stkCallback;
    if (stk) {
      const reference = typeof stk.CheckoutRequestID === "string" ? stk.CheckoutRequestID : "";
      const resultCode = String(stk.ResultCode ?? "");
      if (!reference) throw new Error("M-Pesa callback is missing CheckoutRequestID.");
      const metadata = stk.CallbackMetadata as { Item?: { Name?: string; Value?: unknown }[] } | undefined;
      const items = Array.isArray(metadata?.Item) ? metadata.Item : [];
      const amountItem = items.find((item) => item.Name === "Amount");
      const amount = amountItem && typeof amountItem.Value === "string" ? amountItem.Value
        : amountItem && typeof amountItem.Value === "number" ? String(amountItem.Value) : undefined;
      return {
        reference,
        status: resultCode === "0" ? "DEPOSIT_SUCCESS" : "DEPOSIT_FAILED",
        amount,
      };
    }

    const result = (root.Result as { ResultCode?: unknown; OriginatorConversationID?: unknown } | undefined);
    const resultParams = (root.Result as { ResultParameters?: { ResultItem?: { Name?: string; Value?: unknown }[] } } | undefined);
    if (result) {
      const reference = typeof result.OriginatorConversationID === "string" ? result.OriginatorConversationID : "";
      const resultCode = String(result.ResultCode ?? "");
      if (!reference) throw new Error("M-Pesa callback is missing OriginatorConversationID.");
      const items = Array.isArray(resultParams?.ResultParameters?.ResultItem)
        ? resultParams!.ResultParameters!.ResultItem!
        : [];
      const amountItem = items.find((item) => item.Name === "Amount");
      const amount = amountItem && typeof amountItem.Value === "string" ? amountItem.Value
        : amountItem && typeof amountItem.Value === "number" ? String(amountItem.Value) : undefined;
      return {
        reference,
        status: resultCode === "0" ? "WITHDRAWAL_SUCCESS" : "WITHDRAWAL_FAILED",
        amount,
      };
    }

    throw new Error("Unrecognized M-Pesa callback payload.");
  }
}

export class SandboxSimulatedProvider implements PaymentProvider {
  enabled(): boolean { return true; }

  async initializeDeposit(input: { amount: string; phone: string; idempotencyKey: string }): Promise<{ reference: string; status: PaymentStatus; note: string }> {
    return {
      reference: `sim-${input.idempotencyKey}`,
      status: "DEPOSIT_SUCCESS",
      note: `Sandbox deposit completed — $${input.amount} was added to your real (sandbox) account balance. No real money moved.`,
    };
  }

  async checkDepositStatus(): Promise<PaymentStatus> { return "DEPOSIT_SUCCESS"; }

  async requestWithdrawal(input: { amount: string; phone: string; idempotencyKey: string }): Promise<{ reference: string; status: PaymentStatus; note: string }> {
    return {
      reference: `sim-${input.idempotencyKey}`,
      status: "WITHDRAWAL_SUCCESS",
      note: `Sandbox withdrawal completed — $${input.amount} was debited from your real (sandbox) account balance. No real money moved.`,
    };
  }

  async checkWithdrawalStatus(): Promise<PaymentStatus> { return "WITHDRAWAL_SUCCESS"; }

  async handleWebhook(): Promise<{ reference: string; status: PaymentStatus }> {
    throw new PaymentUnavailableError("The simulated sandbox provider has no webhooks.");
  }
}

export const paymentProvider: PaymentProvider =
  process.env.PAYMENT_PROVIDER === "daraja"
    ? new MpesaDarajaProvider()
    : new SandboxSimulatedProvider();