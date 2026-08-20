# VAMNUX User Dashboard Operations Redesign

**Updated:** 20 August 2026

The protected VAMNUX User Dashboard now uses a dark, compact operations-workspace design built from VAMNUX components and real account records. The layout uses a grouped sidebar, an account-aware top bar, a wallet-review notice, real order-status summary cards, catalog and order actions, and a recent-order panel. It was inspired by the supplied operational-dashboard reference without reproducing its brand, labels, third-party links, payment card offer, currency conversion data, or external content.

The desktop overview was verified with the authenticated account’s actual zero-order and zero-wallet state. Its four status cards derive only from the customer’s stored order statuses: total, in progress, completed, and cancelled/failed. The recent-order panel presents a truthful empty state when no record exists; it does not create placeholder orders or delivery claims.

The mobile overview was rechecked after hiding the desktop sidebar at small widths. It retains the compact top bar, funding-review notice, two-column status cards, private real-data summary, and protected bottom navigation without horizontal overflow. Existing wallet-only purchase gating, support, privacy, profile, notification, security, account isolation, Manus OAuth session, payment inactivity, supplier-order inactivity, and fulfilment inactivity remain unchanged.

