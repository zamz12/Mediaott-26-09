import type { CreateCheckoutInput, CreateCheckoutResult, PaymentProvider } from "./payment.provider";

// Billing is not activated in the MVP. Every entry point that would trigger
// a real charge must call isEnabled() first and show "coming soon" UI when
// false, rather than silently no-opping — see Section 45 (no fake buttons).
export class NoopPaymentProvider implements PaymentProvider {
  isEnabled() {
    return process.env.BILLING_ENABLED === "true";
  }

  async createCheckoutSession(_input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    throw new Error("Billing is not enabled on this platform yet.");
  }

  async cancelSubscription(_externalRef: string): Promise<void> {
    throw new Error("Billing is not enabled on this platform yet.");
  }
}
