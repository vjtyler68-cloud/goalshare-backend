import { google } from 'googleapis';
import serviceAccount from '../../../config/serviceAccount.json';
// ── Constants ──────────────────────────────────────────────────────────────────
const ANDROID_PACKAGE_NAME = process.env.ANDROID_PACKAGE_NAME!;

// ── Verify Google Play Token ───────────────────────────────────────────────────
export const verifyGooglePlayToken = async (
  productId: string,
  purchaseToken: string,
): Promise<{ isValid: boolean; expiryTime: Date }> => {
  // ✅ expiryTime: Date
  const auth = new google.auth.GoogleAuth({
    // credentials: JSON.parse(
    //   process.env.GOOGLE_SERVICE_ACCOUNT_JSON!.replace(/\\n/g, '\n'),
    // ),
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });

  const androidPublisher = google.androidpublisher({ version: 'v3', auth });

  const response = await androidPublisher.purchases.subscriptions.get({
    packageName: ANDROID_PACKAGE_NAME, // ✅ from constant
    subscriptionId: productId,
    token: purchaseToken,
  });
//   console.log({response})


  const purchase = response.data;

  const isValid =
    purchase.paymentState === 1 &&
    parseInt(purchase.expiryTimeMillis!) > Date.now();

  return {
    isValid,
    expiryTime: new Date(parseInt(purchase.expiryTimeMillis!)), // ✅ expiryTime
  };
};

// ── Verify Apple Receipt ───────────────────────────────────────────────────────
export const verifyAppleReceipt = async (
  receipt: string,
): Promise<{ isValid: boolean; expiryTime: Date }> => {
  // ✅ expiryTime: Date
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

  let data = await verifyWithUrl('https://buy.itunes.apple.com/verifyReceipt');

  if (data.status === 21007) {
    data = await verifyWithUrl(
      'https://sandbox.itunes.apple.com/verifyReceipt',
    );
  }

  if (data.status !== 0 || !data.latest_receipt_info?.length) {
    return { isValid: false, expiryTime: new Date(0) }; // ✅ expiryTime
  }

  const latest = data.latest_receipt_info[0];
  const isValid = parseInt(latest.expires_date_ms) > Date.now();

  return {
    isValid,
    expiryTime: new Date(parseInt(latest.expires_date_ms)), // ✅ expiryTime
  };
};
