import { Bell, Check, CheckCheck, ChevronRight, CircleHelp, ClipboardList, Heart, MailCheck, MessageSquareMore, RefreshCw, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import "./adminNotificationInbox.css";

type AdminTab = "orders" | "funding" | "notifications" | "suppliers" | "refunds";
type NotificationItem = {
  key: string;
  group: string;
  title: string;
  body: string;
  createdAt: Date;
  read: boolean;
  customerName?: string | null;
  customerEmail?: string | null;
  entityType: "order" | "activity" | "ticket" | "request" | "subscriber" | "funding" | "supplier" | "refund" | "api";
  entityId: string;
};

const iconForGroup = (group: string) => {
  if (group === "Orders") return ClipboardList;
  if (group === "Favorites & cart") return Heart;
  if (group === "Support tickets") return CircleHelp;
  if (group === "Customer requests") return MessageSquareMore;
  if (group === "Subscribers") return MailCheck;
  if (group === "Wallet funding" || group === "Supplier readiness") return WalletCards;
  return RefreshCw;
};

const destinationFor = (entityType: string): AdminTab => {
  if (entityType === "order") return "orders";
  if (entityType === "refund") return "refunds";
  if (entityType === "funding") return "funding";
  if (entityType === "supplier" || entityType === "api") return "suppliers";
  return "notifications";
};

const sourceLabelFor = (entityType: NotificationItem["entityType"]) => {
  if (entityType === "order") return "VAMNUX order record";
  if (entityType === "refund") return "Order failure or refund record";
  if (entityType === "activity") return "Customer product activity record";
  if (entityType === "ticket") return "Customer support ticket";
  if (entityType === "request") return "Customer product request";
  if (entityType === "subscriber") return "Update-interest consent record";
  if (entityType === "funding") return "Wallet funding review record";
  if (entityType === "supplier") return "Recorded supplier balance observation";
  return "Recorded supplier API request log";
};

export function AdminNotificationInbox({ onNavigate, onOpenTicket }: { onNavigate: (tab: AdminTab) => void; onOpenTicket: (ticketCode: string) => void }) {
  const inbox = trpc.admin.listNotificationInbox.useQuery({ limit: 250 }, { refetchInterval: 30_000, refetchOnWindowFocus: true });
  const utils = trpc.useUtils();
  const [group, setGroup] = useState("All");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [reviewItem, setReviewItem] = useState<NotificationItem | null>(null);
  const markSelected = trpc.admin.markNotificationsRead.useMutation({
    onSuccess: async ({ marked }) => {
      setSelectedKeys([]);
      await utils.admin.listNotificationInbox.invalidate();
      toast.success(`${marked} notification${marked === 1 ? "" : "s"} marked as read.`);
    },
    onError: (error) => toast.error(error.message),
  });
  const markAll = trpc.admin.markAllNotificationsRead.useMutation({
    onSuccess: async ({ marked }) => {
      setSelectedKeys([]);
      await utils.admin.listNotificationInbox.invalidate();
      toast.success(marked ? `${marked} notification${marked === 1 ? "" : "s"} marked as read.` : "No unread notifications to mark.");
    },
    onError: (error) => toast.error(error.message),
  });
  const groups = useMemo(() => ["All", ...Array.from(new Set((inbox.data?.items ?? []).map((item) => item.group)))], [inbox.data?.items]);
  const items = useMemo(() => (inbox.data?.items ?? []).filter((item) => group === "All" || item.group === group), [group, inbox.data?.items]);
  const allVisibleSelected = items.length > 0 && items.every((item) => selectedKeys.includes(item.key));
  const toggleSelected = (key: string) => setSelectedKeys((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  const toggleAllVisible = () => setSelectedKeys((current) => allVisibleSelected ? current.filter((key) => !items.some((item) => item.key === key)) : Array.from(new Set([...current, ...items.filter((item) => !item.read).map((item) => item.key)])));
  const openSourceWorkspace = (item: NotificationItem) => {
    if (item.entityType === "ticket") onOpenTicket(item.entityId);
    onNavigate(destinationFor(item.entityType));
  };

  return <section className="admin-panel admin-notification-inbox">
    <header>
      <div>
        <span>NOTIFICATION INBOX</span>
        <h2>Operational review queue</h2>
        <p>Unread entries are created only from stored VAMNUX records. Marking an item read changes only your Admin review state; it does not change orders, customer requests, funding, support, or supplier records.</p>
      </div>
      <div className="flex items-center gap-2"><span className="admin-unread-count" aria-label={`${inbox.data?.unreadCount ?? 0} unread notifications`}><Bell size={16} />{inbox.data?.unreadCount ?? 0}</span><button type="button" className="admin-secondary-action" onClick={() => void inbox.refetch()} disabled={inbox.isFetching}><RefreshCw size={14} /> Refresh</button></div>
    </header>
    <div className="admin-notification-toolbar">
      <label>Show<select value={group} onChange={(event) => { setGroup(event.target.value); setSelectedKeys([]); }}>{groups.map((option) => <option value={option} key={option}>{option}</option>)}</select></label>
      <div className="admin-funding-actions"><button type="button" className="admin-secondary-action" disabled={!selectedKeys.length || markSelected.isPending} onClick={() => markSelected.mutate({ notificationKeys: selectedKeys })}><Check size={14} /> Mark selected as read</button><button type="button" className="admin-primary-action" disabled={!inbox.data?.unreadCount || markAll.isPending} onClick={() => markAll.mutate()}><CheckCheck size={14} /> Mark all as read</button></div>
    </div>
    {inbox.isLoading ? <p>Loading protected notifications…</p> : <div className="admin-notification-list">
      {items.length ? <><label className="admin-notification-select-all"><input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} aria-label="Select all visible notifications" /> Select unread visible</label>{items.map((item) => { const Icon = iconForGroup(item.group); return <article className={item.read ? "read" : "unread"} key={item.key}><label className="admin-notification-check"><input type="checkbox" checked={selectedKeys.includes(item.key)} disabled={item.read} onChange={() => toggleSelected(item.key)} aria-label={`Select ${item.title}`} /></label><span className="admin-notification-icon"><Icon size={16} /></span><div className="admin-notification-copy"><div className="admin-notification-row"><span>{item.group}</span>{!item.read && <b>New</b>}<time>{new Date(item.createdAt).toLocaleString()}</time></div><strong>{item.title}</strong><p>{item.body}</p>{(item.customerName || item.customerEmail) && <small>{item.customerName || "Customer"}{item.customerEmail ? ` · ${item.customerEmail}` : ""}</small>}</div><div className="admin-notification-actions"><button type="button" className="admin-secondary-action" onClick={() => setReviewItem(item)}>Review <ChevronRight size={14} /></button>{!item.read && <button type="button" className="admin-secondary-action" disabled={markSelected.isPending} onClick={() => markSelected.mutate({ notificationKeys: [item.key] })}><Check size={14} /> Mark read</button>}</div></article>; })}</> : <div className="admin-empty"><Bell size={22} /><h3>No notifications in this view</h3><p>New stored orders, product activity, tickets, requests, subscribers, funding, supplier observations, and failed supplier requests will appear here when available.</p></div>}
    </div>}
    <div className="admin-policy-note mt-5"><Bell size={15} /><span>External email, SMS, push, and WhatsApp delivery are not implied by this inbox and remain inactive until separately configured.</span></div>
    <Dialog open={Boolean(reviewItem)} onOpenChange={(open) => { if (!open) setReviewItem(null); }}>
      <DialogContent className="admin-notification-review-dialog">
        {reviewItem && <>
          <DialogHeader>
            <span className="admin-notification-dialog-kicker">{reviewItem.group} · {reviewItem.read ? "Read" : "Unread"}</span>
            <DialogTitle>{reviewItem.title}</DialogTitle>
            <DialogDescription>Reviewing this notification stays within the VAMNUX Notifications workspace. It does not change the underlying record.</DialogDescription>
          </DialogHeader>
          <div className="admin-notification-detail-grid">
            <div><span>Notification summary</span><strong>{reviewItem.body}</strong></div>
            <div><span>Source record</span><strong>{sourceLabelFor(reviewItem.entityType)}</strong></div>
            <div><span>Reference</span><strong>{reviewItem.entityId}</strong></div>
            <div><span>Recorded</span><strong>{new Date(reviewItem.createdAt).toLocaleString()}</strong></div>
            <div><span>Customer</span><strong>{reviewItem.customerName || "No customer name recorded"}</strong></div>
            <div><span>Customer email</span><strong>{reviewItem.customerEmail || "No customer email recorded"}</strong></div>
          </div>
          <p className="admin-notification-detail-note">Use the source workspace only if you need to take an authorised next step. Reading or closing this detail view does not mark the item read automatically.</p>
          <DialogFooter className="admin-notification-detail-actions">
            {reviewItem.entityType !== "subscriber" && <button type="button" className="admin-secondary-action" onClick={() => { const item = reviewItem; setReviewItem(null); openSourceWorkspace(item); }}>Open source workspace <ChevronRight size={14} /></button>}
            {!reviewItem.read && <button type="button" className="admin-primary-action" disabled={markSelected.isPending} onClick={() => markSelected.mutate({ notificationKeys: [reviewItem.key] }, { onSuccess: () => setReviewItem(null) })}><Check size={14} /> Mark as read</button>}
            <DialogClose asChild><button type="button" className="admin-secondary-action">Close</button></DialogClose>
          </DialogFooter>
        </>}
      </DialogContent>
    </Dialog>
  </section>;
}
