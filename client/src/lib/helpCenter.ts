export type HelpArticle = {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
};

export type HelpSection = {
  title: string;
  description: string;
  articles: HelpArticle[];
};

export const helpSections: HelpSection[] = [
  {
    title: "Orders & Products",
    description: "Guidance for selecting products, reviewing order status, and resolving product concerns.",
    articles: [
      { id: "place-order", question: "How do I place an order?", answer: "Choose an active product, review its requirements and final display price, then add it to your cart. When a verified wallet-funding method and eligible wallet balance are available, VAMNUX can create the relevant wallet-backed order flow.", keywords: ["place order", "buy product", "checkout", "cart"] },
      { id: "buy-game-credits", question: "How do I buy Game Credits?", answer: "Open an active game top-up, select the denomination, and enter every required Player ID, server, or region detail exactly as shown. Review the product before adding it to your cart.", keywords: ["game credits", "pubg uc", "free fire diamonds", "mobile legends diamonds", "top up"] },
      { id: "check-order-status", question: "How do I check my order status?", answer: "Sign in and open Order History in your VAMNUX account. Order information is visible only to the account that owns it.", keywords: ["order status", "track order", "where is my order", "order history"] },
      { id: "processing-order", question: "My order is still processing", answer: "Review the listed delivery format and any delivery window first. If the status does not progress as expected, submit an account-based support ticket with the order selected.", keywords: ["order processing", "pending order", "processing", "delivery delay"] },
      { id: "failed-order", question: "My order failed", answer: "Check the order record in your account, then submit a ticket for a product-specific review. A failed order does not automatically mean a refund or retry is available; eligibility depends on the recorded order state.", keywords: ["failed order", "order failed", "order error"] },
      { id: "wrong-product", question: "I received the wrong product", answer: "Do not redeem or use the product if you believe it is incorrect. Open a support ticket from the account that owns the order so VAMNUX can review the product record and delivery details.", keywords: ["wrong product", "incorrect product", "received wrong"] },
      { id: "digital-code", question: "How do I find my digital code?", answer: "Digital code availability and delivery format are shown on the product and later in the private order record when fulfillment is complete. Never share a code publicly or in an unverified channel.", keywords: ["digital code", "find code", "gift card code", "game key"] },
    ],
  },
  {
    title: "Payments & Wallet",
    description: "Clear information about VAMNUX’s wallet-first purchase model and verified provider readiness.",
    articles: [
      { id: "payment-methods", question: "What payment methods does VAMNUX accept?", answer: "VAMNUX shows payment methods only after a provider has been integrated, verified, and activated. Do not send payment outside a verified VAMNUX funding flow.", keywords: ["payment methods", "paystack", "korapay", "crypto", "usdt"] },
      { id: "fund-wallet", question: "How do I fund my wallet?", answer: "Open Wallet in your account and review the available funding guidance. Your balance changes only after VAMNUX verifies a real payment through an active provider; unconfigured providers cannot fund the wallet.", keywords: ["fund wallet", "wallet funding", "deposit", "add money"] },
      { id: "payment-success-order-pending", question: "My payment was successful but my order is pending", answer: "If a verified payment and a pending order are both recorded, use the linked order and submit a private support ticket. VAMNUX does not ask customers to share payment secrets in public messages.", keywords: ["payment successful order pending", "paid pending", "pending payment"] },
      { id: "payment-failed", question: "My payment failed", answer: "Do not repeat payment attempts outside a verified provider screen. Check Wallet and your provider record when one is active, then contact support if VAMNUX shows a related funding or order issue.", keywords: ["payment failed", "failed payment", "payment error"] },
      { id: "refunds", question: "How do refunds work?", answer: "Refund review depends on the product, delivery state, and recorded transaction. Submit an account-based ticket so VAMNUX can review the specific order instead of assuming eligibility.", keywords: ["refund", "refund policy", "get refund", "money back"] },
      { id: "refund-timing", question: "How long does a refund take?", answer: "Timing depends on the verified payment method, order state, and any provider processing. VAMNUX will show only the status available for the specific account record.", keywords: ["refund time", "refund pending", "refund status", "how long refund"] },
    ],
  },
  {
    title: "Gift Cards & Game Keys",
    description: "Understand codes, platforms, regions, and redemption before you place an order.",
    articles: [
      { id: "redeem-gift-card", question: "How do I redeem my gift card?", answer: "Follow the redemption instructions shown by the product’s platform and verify the listed region first. VAMNUX does not change a platform’s redemption requirements.", keywords: ["redeem gift card", "gift card redemption", "redeem code"] },
      { id: "region-locked", question: "What does Region Locked mean?", answer: "A region-locked code can be redeemed only in the country, store region, or account region stated in the product details. Always check before ordering.", keywords: ["region locked", "region restriction", "country", "gift card region"] },
      { id: "change-gift-card", question: "Can I change my gift card after purchase?", answer: "Digital products can have different change and refund conditions once delivered or revealed. Review the product and policy information, then submit a ticket for the specific order if needed.", keywords: ["change gift card", "swap gift card", "gift card after purchase"] },
      { id: "game-key-not-working", question: "My game key isn't working", answer: "Check the platform, region, account, and redemption instructions first. If the key remains unusable, do not publish it; submit a private ticket with the linked order.", keywords: ["game key not working", "key invalid", "activation key", "steam key"] },
    ],
  },
  {
    title: "Game Top-Up",
    description: "Protect your Player ID, choose the correct game details, and understand top-up review steps.",
    articles: [
      { id: "find-player-id", question: "Where do I find my Player ID?", answer: "Open the game profile or account area and copy the Player ID exactly as the game displays it. Some products also require a server or zone identifier, which is shown before you add the item to cart.", keywords: ["player id", "game id", "pubg id", "free fire id", "mobile legends id"] },
      { id: "wrong-player-id", question: "I entered the wrong Player ID", answer: "Stop before placing an order if you spot an incorrect Player ID. Once a top-up is fulfilled to the supplied account, correction may not be possible. Submit a ticket immediately if an order record already exists.", keywords: ["wrong player id", "incorrect player id", "wrong game id"] },
      { id: "credits-not-arrived", question: "My game credits haven't arrived", answer: "Check the order status and listed delivery window first. If the stated window has passed, submit a support ticket with the linked order for review.", keywords: ["credits not arrived", "game credits missing", "uc not received", "diamonds not received"] },
      { id: "cancel-top-up", question: "Can I cancel a game top-up?", answer: "Cancellation depends on the order state and whether fulfillment has begun. Use the order record and support ticket flow for a review rather than assuming a top-up can be reversed.", keywords: ["cancel game top up", "cancel top up", "cancel uc"] },
    ],
  },
  {
    title: "Account & Security",
    description: "Keep your account information private and use the existing protected VAMNUX account controls.",
    articles: [
      { id: "create-account", question: "How do I create an account?", answer: "Use the secure account entry action in the VAMNUX header. Your account provides private access to favorites, wallet context, orders, support, and settings.", keywords: ["create account", "sign up", "register"] },
      { id: "reset-password", question: "How do I reset my password?", answer: "VAMNUX password-recovery email is not available until transactional email is configured. Use the current secure sign-in route and do not send password information to support.", keywords: ["reset password", "forgot password", "password recovery"] },
      { id: "verify-email", question: "How do I verify my email?", answer: "Email verification can be activated only when a verified delivery provider is configured. VAMNUX does not claim an email verification flow is live before that point.", keywords: ["verify email", "email verification", "confirm email"] },
      { id: "change-account", question: "How do I change my account details?", answer: "Sign in and open Account Settings or Profile in your dashboard to review the available account fields. Changes are scoped to your own account.", keywords: ["change account details", "edit profile", "update email", "account settings"] },
      { id: "secure-account", question: "How do I secure my account?", answer: "Use a strong unique password where available, keep recovery information private, and review Security settings. Never share passwords, authenticator codes, payment details, or wallet secrets with anyone.", keywords: ["secure account", "account security", "mfa", "authenticator"] },
    ],
  },
  {
    title: "Subscriptions & Software",
    description: "Find activation guidance and private support for eligible subscriptions, software, licenses, and keys.",
    articles: [
      { id: "activate-subscription", question: "How do I activate my subscription?", answer: "Review the subscription’s listed service, region, term, and delivery instructions. Activation steps are product-specific and appear only when the relevant product is active.", keywords: ["activate subscription", "subscription activation", "netflix", "spotify"] },
      { id: "activate-software", question: "How do I activate software?", answer: "Follow the software platform’s instructions and confirm the product’s license, region, device, and account requirements before activation.", keywords: ["activate software", "software activation", "license activation"] },
      { id: "find-license", question: "Where can I find my license or key?", answer: "When a product is fulfilled, its delivery format and private order record identify where an eligible code or license is available. Keep keys private.", keywords: ["find license", "license key", "software key", "activation code"] },
      { id: "activation-fails", question: "What happens if my activation fails?", answer: "Check the platform, region, account, and activation instructions first. If the issue continues, submit a ticket from the account that owns the order so VAMNUX can review it privately.", keywords: ["activation failed", "software not activating", "subscription failed"] },
    ],
  },
];

export const helpArticles = helpSections.flatMap((section) => section.articles.map((article) => ({ ...article, section: section.title })));
