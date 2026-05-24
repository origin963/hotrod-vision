const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");

/**
 * Stripe Webhook → Supabase
 * - Verifies Stripe signature
 * - Writes membership + token ledger entries
 *
 * Required env vars (Netlify):
 * STRIPE_SECRET_KEY
 * STRIPE_WEBHOOK_SECRET
 * SUPABASE_URL
 * SUPABASE_SERVICE_ROLE_KEY
 */
exports.handler = async (event) => {
  // Stripe requires the RAW body for signature verification
  const sig = event.headers["stripe-signature"] || event.headers["Stripe-Signature"];
  if (!sig) return { statusCode: 400, body: "Missing Stripe signature header" };

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return { statusCode: 400, body: `Webhook signature verification failed: ${err.message}` };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Helper: safe upsert membership
  async function upsertMembership({
    userId,
    tier,
    status,
    stripeCustomerId,
    stripeSubscriptionId,
    currentPeriodEnd,
  }) {
    const { error } = await supabase.from("pit_crew_memberships").upsert(
      {
        user_id: userId,
        tier,
        status,
        stripe_customer_id: stripeCustomerId || null,
        stripe_subscription_id: stripeSubscriptionId || null,
        current_period_end: currentPeriodEnd || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (error) throw error;
  }

  // Helper: award tokens + ledger record (idempotent via unique ref)
  async function awardTokens({ userId, amount, reason, ref }) {
    // 1) Insert ledger row (unique ref prevents duplicates)
    const { error: ledgerErr } = await supabase.from("token_ledger").insert({
      user_id: userId,
      amount,
      reason,
      ref,
      created_at: new Date().toISOString(),
    });
    if (ledgerErr) {
      // If duplicate ref, ignore (idempotent)
      if (String(ledgerErr.message || "").toLowerCase().includes("duplicate")) return;
      throw ledgerErr;
    }

    // 2) Upsert balance
    // We keep balances in token_balances, plus immutable ledger for audit
    const { data: balRow, error: balGetErr } = await supabase
      .from("token_balances")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();

    if (balGetErr) throw balGetErr;

    const current = balRow?.balance ?? 0;
    const next = current + amount;

    const { error: balUpErr } = await supabase.from("token_balances").upsert(
      { user_id: userId, balance: next, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
    if (balUpErr) throw balUpErr;
  }

  // Helper: map Stripe price/product metadata to tier + token policy
  // BEST PRACTICE: set metadata on Stripe Price objects:
  // tier = "crew_chief" | "founding_individual" | "founding_business" | "legend_business"
  // welcome_tokens = "1000"
  // monthly_tokens = "250"
  function getTierConfigFromStripeObject(obj) {
    const md = obj?.metadata || {};
    const tier = md.tier || null;

    const welcomeTokens = Number(md.welcome_tokens || 0);
    const monthlyTokens = Number(md.monthly_tokens || 0);

    return { tier, welcomeTokens, monthlyTokens };
  }

  try {
    switch (stripeEvent.type) {
      /**
       * Subscription created/updated/paid
       * We’ll use invoice.payment_succeeded as the “membership is paid” truth.
       */
      case "invoice.payment_succeeded": {
        const invoice = stripeEvent.data.object;

        // Subscription invoices have subscription + customer
        const stripeCustomerId = invoice.customer;
        const stripeSubscriptionId = invoice.subscription;

        // We need the user_id to map Stripe->Supabase user.
        // Easiest: store user_id in Stripe Customer metadata when creating checkout session.
        const customer = await stripe.customers.retrieve(stripeCustomerId);
        const userId = customer?.metadata?.user_id;

        if (!userId) {
          return { statusCode: 200, body: "No user_id on customer metadata; skipping" };
        }

        // Get first line item price metadata (tier + token policy)
        const line = invoice.lines?.data?.[0];
        const price = line?.price;
        const { tier, welcomeTokens, monthlyTokens } = getTierConfigFromStripeObject(price);

        // Update membership record in Supabase
        const currentPeriodEnd = line?.period?.end
          ? new Date(line.period.end * 1000).toISOString()
          : null;

        await upsertMembership({
          userId,
          tier: tier || "unknown",
          status: "active",
          stripeCustomerId,
          stripeSubscriptionId,
          currentPeriodEnd,
        });

        // Award welcome tokens ONCE per subscription (idempotent by ref)
        // Ref uses subscription id + "welcome"
        if (welcomeTokens > 0) {
          await awardTokens({
            userId,
            amount: welcomeTokens,
            reason: "welcome_tokens",
            ref: `${stripeSubscriptionId}:welcome`,
          });
        }

        // Award monthly tokens each paid cycle (idempotent by invoice id)
        if (monthlyTokens > 0) {
          await awardTokens({
            userId,
            amount: monthlyTokens,
            reason: "monthly_tokens",
            ref: `invoice:${invoice.id}:monthly`,
          });
        }

        break;
      }

      case "customer.subscription.deleted": {
        const sub = stripeEvent.data.object;
        const stripeCustomerId = sub.customer;
        const customer = await stripe.customers.retrieve(stripeCustomerId);
        const userId = customer?.metadata?.user_id;

        if (userId) {
          await upsertMembership({
            userId,
            tier: sub?.items?.data?.[0]?.price?.metadata?.tier || "unknown",
            status: "canceled",
            stripeCustomerId,
            stripeSubscriptionId: sub.id,
            currentPeriodEnd: null,
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = stripeEvent.data.object;
        const stripeCustomerId = invoice.customer;
        const customer = await stripe.customers.retrieve(stripeCustomerId);
        const userId = customer?.metadata?.user_id;

        if (userId) {
          await upsertMembership({
            userId,
            tier: invoice?.lines?.data?.[0]?.price?.metadata?.tier || "unknown",
            status: "past_due",
            stripeCustomerId,
            stripeSubscriptionId: invoice.subscription,
            currentPeriodEnd: null,
          });
        }
        break;
      }

      default:
        // ignore other event types for now
        break;
    }

    return { statusCode: 200, body: "ok" };
  } catch (err) {
    return { statusCode: 500, body: `Webhook handler error: ${err.message}` };
  }
};