<p align="center">
  <img src="assets/icon.png" width="120" alt="CoreLedger app icon" />
</p>

<h1 align="center">CoreLedger</h1>

<p align="center">
  <strong>Clear records. Stronger business. Brighter future.</strong><br />
  Bookkeeping, credit tracking, inventory, and Mobile Money payments for Ghanaian shops.
</p>

## Overview

CoreLedger is a cross-platform bookkeeping app built for small shops in Ghana. It records sales and expenses in Ghana Cedis (GHS), tracks credit customers, manages stock, tracks daily income against a sales target, and accepts Mobile Money payments through Paystack.

The app is built with Expo and React Native and runs on Android, iOS, and the web. Firebase Authentication and Cloud Firestore provide accounts and cloud data. AI-assisted entry and insights use Groq or Anthropic when API keys are configured, with local fallbacks when they are not.

## Features

### Daily operations

- Dashboard with today's sales, expenses, income, and progress toward a daily target.
- Record sales as Cash, MoMo, or Credit, with optional buyer details.
- Record expenses by category.
- Recent transactions and pull-to-refresh.
- Daily AI insight based on recent sales, peak day, top category, and target progress.

### Credit sales

- Credit sales require a buyer name and phone number.
- Outstanding credit list with total amount owed.
- Edit buyer details and mark a credit sale as paid.
- Paid credit sales are removed from the outstanding list.

### Inventory

- Add, edit, and delete stock items.
- Track quantity, unit, cost price, selling price, and low-stock threshold.
- Low-stock warnings and a retail stock-value summary.
- Optional margin calculation while editing an item.
- Linking an inventory item to a sale automatically deducts the quantity sold.

### Reports and exports

- Weekly and monthly income charts.
- Sales, expenses, and income totals.
- Top-selling categories.
- AI-generated business insight.
- CSV export through the native share sheet.
- Branded PDF report through Expo Print and Expo Sharing.

### Mobile Money payments

- Send a Paystack Mobile Money charge directly to a buyer's phone.
- Support for MTN, Vodafone, and AirtelTigo number prefixes.
- In-app handling for OTP or PIN challenges.
- Payment status polling with success, failure, and timeout states.
- Completed MoMo sales are saved to the ledger with a payment reference.

### Accounts and shop setup

- Email/password sign-up, sign-in, and password reset through Firebase Auth.
- Three-step onboarding flow.
- Shop profile with name, category, phone number, and daily sales target.
- Shop settings and business-health summary.

## Tech stack

| Layer | Technology |
| --- | --- |
| App | Expo SDK 58, React Native 0.88, React 19 |
| Navigation | React Navigation 7 (native stack and bottom tabs) |
| Auth and data | Firebase Authentication, Cloud Firestore |
| Payments | Paystack direct charge through Supabase Edge Functions (Deno) |
| AI | Groq (`llama-3.3-70b-versatile` by default), Anthropic fallback, local fallback |
| Device features | Expo Secure Store, Print, and Sharing; Audio, SQLite, and Speech are installed but not currently wired |
| Builds | EAS Build, with an EAS Submit profile scaffold in `eas.json` |
| Styling | React Native StyleSheet with a navy, gold, and cream theme |

## Architecture

| Component | Responsibility |
| --- | --- |
| Expo app | Screens, navigation, validation, business rules, AI calls, and payment polling |
| Firebase Auth | Email/password accounts and session state |
| Cloud Firestore | Shops, transactions, inventory, and legacy payment records |
| Supabase Edge Functions | Server-side Paystack charge, verification, and OTP proxy |
| Paystack | Mobile Money charge and buyer USSD prompt |
| Groq / Anthropic | Free-text transaction parsing and business insights |

### Active backend path

The current client uses:

- **Firebase Auth** for account creation and sign-in.
- **Cloud Firestore** as the primary data store.
- **Supabase Edge Functions** only for Paystack Mobile Money calls:
  - `momo-charge` starts a direct charge.
  - `momo-submit-otp` submits an OTP or PIN when Paystack requests one.
  - `momo-verify` checks the charge status while the app polls.
- **Groq** as the preferred AI provider, with Anthropic as an optional fallback.

### Legacy backends in this repository

The repository also contains two alternative Paystack implementations that the current app does not call:

- `functions/` - Firebase Cloud Functions for charge and webhook handling.
- `server/` - Express API intended for Vercel or another Node host.

They are documented here so the code is not mistaken for the active path. The Express server and Firebase Functions require separate environment setup before they can be used.

`src/lib/sync.js` is a Supabase transaction-sync helper that is also not imported by the current screens.

## Screens and flows

| Screen | Purpose |
| --- | --- |
| Onboarding | Three intro slides; completes onboarding and opens sign-in |
| Sign In | Email/password sign-in, account creation, password reset |
| Shop Setup | Shop name, category, daily target, and phone number |
| Home | Today's totals, target progress, AI insight, recent transactions |
| Ledger | Search, type filters, date filters, and transactions grouped by day |
| Add | Choose sale or expense, plus the outstanding credit-sales list |
| Add Sale | Amount, inventory link, AI parsing, Cash/MoMo/Credit, buyer details |
| Add Expense | Amount, description, and category |
| Reports | Weekly/monthly income chart, top categories, AI insight |
| Inventory | Stock list, low-stock alerts, stock value, add/edit/delete |
| Profile | Shop details, business health, PDF export, sign-out |
| Settings | Default low-stock level, CSV export, clear transaction history |

## Data model

Firestore collections used by the app:

### `shops`

| Field | Description |
| --- | --- |
| `ownerId` | Firebase Auth UID of the shop owner |
| `name` | Shop name |
| `category` | Shop category |
| `phone` | Contact phone number |
| `daily_target` | Daily sales target in GHS |
| `created_at`, `updatedAt` | Creation and update timestamps |

### `transactions`

| Field | Description |
| --- | --- |
| `ownerId` | Firebase Auth UID |
| `shopId` | Shop document ID |
| `type` | `sale` or `expense` |
| `amount` | Amount in GHS |
| `description` | Transaction description |
| `category` | Transaction category |
| `payment_method` | `Cash`, `MoMo`, `Credit`, or null for expenses |
| `is_credit` | `1` when the sale is on credit |
| `buyer_name`, `buyer_phone` | Buyer details for credit sales |
| `credit_paid` | `1` after a credit sale is marked paid |
| `payment_status`, `payment_reference` | Paystack status and reference |
| `createdAt`, `created_at` | Creation timestamps |

### `inventory`

| Field | Description |
| --- | --- |
| `ownerId` | Firebase Auth UID |
| `name`, `category` | Item identity |
| `quantity`, `unit` | Current stock and unit of measure |
| `costPrice`, `sellingPrice` | Purchase and sale prices in GHS |
| `lowStockThreshold` | Warning threshold |
| `createdAt`, `updatedAt` | Creation and update timestamps |

### `payments`

This collection is written by the legacy Express backend and read by the legacy Firebase Functions webhook. The active Supabase flow verifies the charge directly with Paystack and does not create Firestore payment documents.

| Field | Description |
| --- | --- |
| `ownerId`, `shopId` | Owner and shop identifiers |
| `amount`, `phone` | Charge amount and buyer phone |
| `description`, `category` | Sale context |
| `status` | `pending`, `completed`, or `failed` |
| `paystackRef`, `paystackChargeStatus` | Paystack reference and raw status |
| `channel`, `provider` | Payment channel and inferred MoMo provider |

## Getting started

### Prerequisites

- Node.js 20 or newer
- npm
- Expo Go for quick previews, or an Android/iOS development build
- A Firebase project for real authentication and cloud data
- A Supabase project for Mobile Money payments
- A Groq API key for AI features (optional)
- A Paystack account with Ghana Mobile Money enabled (optional)
- EAS CLI for installable builds (optional)

### Installation

```bash
git clone <repository-url>
cd ledger
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Fill in the values described in [Environment variables](#environment-variables).

### Run the app

```bash
npm start          # Expo development server
npm run android    # Android
npm run ios        # iOS (requires macOS/Xcode)
npm run web        # Web build
```

The iOS script requires macOS and Xcode. The web target uses React Native Web.

### Demo mode

If Firebase is not configured, any valid-looking email and password will sign in. In this mode, shop and transaction data live in memory only and are lost when the app reloads. The onboarding flag still persists through Secure Store or AsyncStorage.

### Firebase setup

1. Create a Firebase project.
2. Enable **Authentication > Sign-in method > Email/Password**.
3. Create a Cloud Firestore database.
4. Add the Firebase web app configuration values to `.env`.
5. Apply `firestore.rules`.

This repository does not include `firebase.json` or `.firebaserc`. You can paste the rules into the Firebase Console, or add Firebase CLI configuration before running:

```bash
npx firebase-tools deploy --only firestore:rules
```

The included rules are suitable for development only. Before production, scope every collection to its owner and tighten the `payments` rules. See [Security notes](#security-notes).

### Supabase and Paystack setup

The app invokes Supabase Edge Functions for Mobile Money. From the repository root:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase secrets set PAYSTACK_SECRET_KEY=sk_test_xxx
npx supabase functions deploy momo-charge
npx supabase functions deploy momo-verify
npx supabase functions deploy momo-submit-otp
```

Add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` to `.env`.

Optional Paystack webhook endpoint:

```bash
npx supabase functions deploy momo-webhook --no-verify-jwt
```

The current `momo-webhook` function verifies the Paystack signature and logs events, but it does not update Firestore. The app relies on polling `momo-verify` for confirmation.

Optional phone/SMS functions:

- `bms-otp` provides a phone OTP API. It expects an `otp_codes` table, but no migration is included in this repository.
- `send-sms` is a Supabase Auth Send SMS hook.

These functions are not used by the current email/password sign-in flow.

### EAS builds

`app.json` contains the Android package name (`com.coreledger.app`) and an EAS project ID. `eas.json` defines development, preview, and production profiles.

```bash
npx eas-cli login
npx eas-cli build --profile preview --platform android
npx eas-cli build --profile production --platform android
```

Add an iOS `bundleIdentifier` in `app.json` before building for iOS.

## Environment variables

All `EXPO_PUBLIC_*` values are bundled into the client app. Do not put server secrets in these variables.

### Firebase (required for real auth and data)

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase web API key |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Firebase app ID |

### Supabase (required for Mobile Money)

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key, used to invoke Edge Functions |

### AI (optional)

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_GROQ_API_KEY` | Groq API key for parsing and insights |
| `EXPO_PUBLIC_GROQ_MODEL` | Groq model name; defaults to `llama-3.3-70b-versatile` |
| `EXPO_PUBLIC_ANTHROPIC_API_KEY` | Optional Anthropic fallback |

Without an AI key, the app uses a local regex parser and local analytics for insights.

### Supabase Edge secrets

Set these with `npx supabase secrets set`, not in the Expo app:

| Variable | Purpose |
| --- | --- |
| `PAYSTACK_SECRET_KEY` | Paystack secret key; required for Mobile Money |
| `BMS_API_KEY` | Optional SMS/OTP provider key |
| `BMS_API_URL` | Optional SMS/OTP provider URL |
| `BMS_SENDER_ID` | Optional SMS sender name |

### Legacy variables

`EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL` is read by no current screen or payment path. It is retained only for the legacy Firebase Functions backend.

The Express server uses its own `.env` in `server/`:

- `FIREBASE_SERVICE_ACCOUNT` - base64-encoded Firebase service account JSON.
- `PAYSTACK_SECRET_KEY` - Paystack secret key.

See `server/.env.example`.

## Available scripts

| Script | Description |
| --- | --- |
| `npm start` | Start the Expo development server |
| `npm run android` | Start Expo and open Android |
| `npm run ios` | Start Expo and open iOS |
| `npm run web` | Start Expo for the web |

There are no test, lint, or type-check scripts configured in `package.json`.

## Project structure

```text
.
├── App.js                      # App bootstrap, splash, navigation container
├── index.js                    # Expo entry point
├── app.json                    # Expo app configuration
├── eas.json                    # EAS build profiles
├── firestore.rules             # Firestore security rules
├── src/
│   ├── components/             # Shared UI components
│   ├── constants/              # Colors, strings, and category lists
│   ├── context/                # Auth context and onboarding state
│   ├── database.js             # Firestore data access and fallbacks
│   ├── lib/
│   │   ├── firebase.js         # Firebase initialization
│   │   ├── supabase.js         # Supabase client
│   │   ├── payments.js         # Paystack charge, OTP, and polling helpers
│   │   └── sync.js             # Unused Supabase sync helper
│   ├── navigation/             # Root, auth, and bottom-tab navigators
│   ├── screens/                # App screens
│   └── utils/                  # AI, analytics, CSV, PDF, speech, settings
├── supabase/functions/         # Paystack Edge Functions and optional SMS functions
├── functions/                  # Legacy Firebase Functions backend
└── server/                     # Legacy Express backend
```

## Mobile Money payment flow

1. The seller selects **MoMo** in Add Sale and enters the buyer's phone number.
2. `initializePayment` invokes the `momo-charge` Supabase function.
3. The function normalizes the Ghana number, infers the provider, and calls Paystack's `/charge` endpoint.
4. Paystack sends a USSD or STK prompt to the buyer's phone.
5. If Paystack asks for an OTP or PIN, the app collects it and invokes `momo-submit-otp`.
6. `watchPayment` polls `momo-verify` every three seconds for up to 90 seconds.
7. On success, the sale is saved with `payment_status: completed` and a Paystack reference; linked inventory is deducted.
8. On failure or timeout, the app shows an error and does not save the sale.

Payment confirmation happens in the client. If the app is closed before confirmation, the sale may not be recorded even if the buyer completes the payment. Production deployments should reconcile payments server-side.

## AI behavior

- `parseTransactionText` parses free-text sale descriptions when the description field loses focus.
- `generateInsight` produces short, target-aware business insights on Home, Reports, and Profile.
- Groq is used when `EXPO_PUBLIC_GROQ_API_KEY` is set.
- Anthropic is used as a fallback when only `EXPO_PUBLIC_ANTHROPIC_API_KEY` is set.
- If neither key is present, local parsing and analytics keep the app usable.

AI requests are made directly from the app. Any API key placed in an `EXPO_PUBLIC_*` variable can be extracted from a built app. Use an authenticated backend proxy for production AI usage.

## Exports

### CSV

Settings exports transactions with these columns:

`date, type, amount, description, category, payment_method, is_credit`

The file is shared through the platform share sheet.

### PDF

Profile exports a branded HTML report rendered to PDF with Expo Print. It includes summary cards and a transaction table, then opens the native share sheet. On web, it opens the browser print dialog.

In Firestore mode, exports use the same query window as the app: the latest 200 transactions.

## Security notes

- `.env` is gitignored. Never commit API keys or service-account JSON.
- `EXPO_PUBLIC_*` values are public in the built app. Never place `PAYSTACK_SECRET_KEY`, a Supabase service-role key, or other server secrets there.
- The included Firestore rules allow any authenticated user to read and write any `shops`, `transactions`, and `inventory` document. Scope access by `ownerId` before production.
- The Supabase `momo-charge` function does not authenticate the Firebase caller or verify shop ownership. Add authentication and rate limiting before exposing it publicly.
- Buyer names and phone numbers are stored in Firestore. Handle this personal data according to your privacy obligations.
- Payment reconciliation should be moved to a trusted server for production so a closed app or interrupted connection cannot lose a completed payment.

## Known limitations

| Area | Current behavior |
| --- | --- |
| Offline support | Firestore persistence is enabled on web through IndexedDB; native persistence is not explicitly configured. Demo mode is memory-only. |
| Data window | Firestore queries load at most the latest 200 transactions, so totals and reports are based on that window. |
| Voice input | Recording and transcription utilities exist, but transcription is a stub and no screen uses them. |
| Localization | English and Twi strings exist in `src/constants/index.js`, but the UI is hardcoded to English. |
| Currency | Settings stores a currency preference, but screens display GHS amounts directly. |
| Monthly reports | The monthly view computes a 30-day series and then plots only the last seven points. |
| Legacy backends | `functions/` and `server/` are not called by the current client. `server/` requires its own environment setup. |
| Firebase deploy | `firebase.json` and `.firebaserc` are not included. |
| Database migrations | No SQL migrations or `seed.sql` are included, although `supabase/config.toml` references a seed file. |
| Phone OTP | `bms-otp` requires an `otp_codes` table that is not included. |
| iOS builds | `app.json` has no iOS `bundleIdentifier`. |
| Tests and lint | No automated tests, lint, or type-check scripts are configured. |
| License attribution | `LICENSE` retains the Expo template copyright notice. |

## Roadmap

- Harden Firestore rules and scope all data to the authenticated owner.
- Move AI and payment calls behind authenticated server-side proxies.
- Add server-side Paystack reconciliation and idempotency.
- Finish voice input and wire the Twi localization.
- Add automated tests, linting, and CI.
- Add schema migrations and Firebase CLI configuration.
- Fix the monthly report range and remove or archive unused backends.

## Contributing

Contributions are welcome. The project has no automated test suite yet, so run the app and verify changes manually across the affected screens. Keep new data access in `src/database.js` and new payment logic in `src/lib/payments.js` or the Supabase Edge Functions.

## License

MIT. See [LICENSE](LICENSE).

The current `LICENSE` file retains the Expo template copyright notice attributed to 650 Industries, Inc. Update it if you distribute the app under your own name or organization.
