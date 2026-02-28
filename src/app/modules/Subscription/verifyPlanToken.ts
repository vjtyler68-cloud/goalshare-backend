import { google } from 'googleapis';

// ─── Verify Google Play Token ─────────────────────────────────────────────────
const verifyGooglePlayToken = async (
  packageName: string,
  productId: string,
  purchaseToken: string,
): Promise<{ isValid: boolean; expiryTimeMillis: string }> => {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!),
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });

  const androidPublisher = google.androidpublisher({ version: 'v3', auth });

  const response = await androidPublisher.purchases.subscriptions.get({
    packageName,
    subscriptionId: productId,
    token: purchaseToken,
  });

  const purchase = response.data;

  const isValid =
    purchase.paymentState === 1 && // 1 = Payment received
    parseInt(purchase.expiryTimeMillis!) > Date.now();

  return {
    isValid,
    expiryTimeMillis: purchase.expiryTimeMillis!,
  };
};

// ─── Verify Apple Receipt ─────────────────────────────────────────────────────
const verifyAppleReceipt = async (
  receipt: string,
): Promise<{ isValid: boolean; expiresDateMs: string }> => {
  const verifyWithUrl = async (url: string) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        'receipt-data': receipt,
        password: process.env.APP_STORE_SHARED_SECRET!,
        'exclude-old-transactions': true,
      }),
    });
    return res.json();
  };

  // Try production first, fallback to sandbox
  let data = await verifyWithUrl('https://buy.itunes.apple.com/verifyReceipt');

  // status 21007 = sandbox receipt sent to production → retry with sandbox
  if (data.status === 21007) {
    data = await verifyWithUrl(
      'https://sandbox.itunes.apple.com/verifyReceipt',
    );
  }

  if (data.status !== 0 || !data.latest_receipt_info?.length) {
    return { isValid: false, expiresDateMs: '0' };
  }

  // Get the most recent receipt (already sorted by Apple)
  const latest = data.latest_receipt_info[0];
  const isValid = parseInt(latest.expires_date_ms) > Date.now();

  return {
    isValid,
    expiresDateMs: latest.expires_date_ms,
  };
};
