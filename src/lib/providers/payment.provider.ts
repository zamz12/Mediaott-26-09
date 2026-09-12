// PaymentProvider — kept OFF for MVP (Section 37/17). Defining the interface
// now means enabling billing later is "implement + swap provider", not a
// redesign. A future Malaysian gateway (e.g. Billplz, iPay88, ToyyibPay)
// implements this same contract.

export interface CreateCheckoutInput {
  userId: string;
  planId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CreateCheckoutResult {
  checkoutUrl: string;
  externalRef: string;
}

export interface PaymentProvider {
  isEnabled(): boolean;
  createCheckoutSession(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
  cancelSubscription(externalRef: string): Promise<void>;
}
