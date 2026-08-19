import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { ArrowRight, CreditCard, PackageOpen, ShieldCheck, WalletCards } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

function AccountContent() {
  const { data, isLoading, error } = trpc.marketplace.accountSummary.useQuery();
  const { data: currentUser } = trpc.auth.me.useQuery();
  const [supplierPage, setSupplierPage] = useState(1);
  const syncCatalog = trpc.admin.syncFlashTopUpCatalog.useMutation({
    onSuccess: (result) => {
      const failureNote = result.failures.length ? ` ${result.failures.length} product lookup(s) need review.` : "";
      toast.success(`FlashTopUp page ${result.page} synced: ${result.serviceCount} services from ${result.productCount} products.${failureNote}`);
      if (result.nextPage) setSupplierPage(result.nextPage);
    },
    onError: (syncError) => toast.error(syncError.message || "FlashTopUp catalog sync failed."),
  });

  if (isLoading) return <div className="p-8 text-sm text-muted-foreground">Loading your VAMNUX account…</div>;
  if (error || !data) return <div className="p-8 text-sm text-destructive">We could not load account information. Please refresh and try again.</div>;

  return (
    <div className="min-h-full bg-[#f5f6f8] p-4 text-[#10121a] md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-bold tracking-[.16em] text-[#286dff]">VAMNUX / CUSTOMER ACCOUNT</p><h1 className="mt-2 font-['Barlow_Condensed'] text-5xl font-extrabold uppercase tracking-[-.05em]">Your digital hub.</h1><p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">Orders, wallet activity, and delivery records will live here as VAMNUX connects authorised suppliers and payment services.</p></div>
          <Link href="/" className="inline-flex items-center gap-2 self-start border-b border-[#10121a] pb-1 text-xs font-bold uppercase tracking-[.08em] sm:self-auto">Back to marketplace <ArrowRight size={15} /></Link>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-xl bg-[#10121a] p-6 text-white shadow-lg"><WalletCards className="mb-8 text-[#b8ff43]" size={26} /><p className="text-xs font-bold tracking-[.13em] text-slate-400">VAMNUX WALLET</p><strong className="mt-2 block text-4xl font-bold">{data.wallet.currency} {Number(data.wallet.availableBalance).toFixed(2)}</strong><p className="mt-3 text-xs leading-5 text-slate-300">Status: {data.wallet.status}. Funding and wallet payments are ready to connect to your payment provider.</p></article>
          <article className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"><PackageOpen className="mb-8 text-[#286dff]" size={26} /><p className="text-xs font-bold tracking-[.13em] text-slate-500">RECENT ORDERS</p><strong className="mt-2 block text-4xl font-bold">{data.orders.length}</strong><p className="mt-3 text-xs leading-5 text-slate-500">Your paid, processing, and delivered digital purchases will appear here.</p></article>
          <article className="rounded-xl bg-[#b8ff43] p-6 shadow-sm"><ShieldCheck className="mb-8 text-[#10121a]" size={26} /><p className="text-xs font-bold tracking-[.13em] text-[#10121a]">ACCOUNT READINESS</p><strong className="mt-2 block text-2xl font-bold">Secure account active</strong><p className="mt-3 text-xs leading-5 text-slate-700">A protected account session is now available for orders, support, wallet entries, and saved products.</p></article>
        </section>

        <section className="mt-7 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold tracking-[.13em] text-[#286dff]">ORDER TRACKING</p><h2 className="mt-2 font-['Barlow_Condensed'] text-3xl font-bold uppercase">Recent activity</h2></div><CreditCard className="text-slate-400" size={24} /></div><div className="mt-6 divide-y divide-slate-100 border-y border-slate-100">{data.orders.length === 0 ? <div className="py-8 text-sm text-slate-500">No orders yet. When checkout is connected to approved products and payments, your delivery status will appear here.</div> : data.orders.map((order) => <div key={order.orderCode} className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm"><div><strong>{order.orderCode}</strong><p className="mt-1 text-xs text-slate-500">{new Date(order.createdAt).toLocaleString()}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-600">{order.status.replaceAll("_", " ")}</span><strong>{order.currency} {Number(order.total).toFixed(2)}</strong></div>)}</div></section>
        {currentUser?.role === "admin" && <section className="mt-7 rounded-xl border border-[#b8ff43] bg-[#10121a] p-6 text-white shadow-lg"><p className="text-xs font-bold tracking-[.13em] text-[#b8ff43]">SUPPLIER ADMIN</p><h2 className="mt-2 font-['Barlow_Condensed'] text-3xl font-bold uppercase">FlashTopUp catalog sync</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Sync small supplier pages to keep the integration responsive and recoverable. This read-only operation never creates customer orders, funds wallets, or enables payment.</p><p className="mt-4 text-xs font-bold uppercase tracking-[.12em] text-slate-400">Next supplier page: {supplierPage} · 5 products maximum</p><button type="button" onClick={() => syncCatalog.mutate({ page: supplierPage, perPage: 5 })} disabled={syncCatalog.isPending} className="mt-5 inline-flex items-center rounded-full bg-[#b8ff43] px-5 py-3 text-xs font-extrabold uppercase tracking-[.1em] text-[#10121a] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60">{syncCatalog.isPending ? "Syncing supplier page…" : "Sync next supplier page"}</button></section>}
      </div>
    </div>
  );
}

export default function Account() {
  return <DashboardLayout><AccountContent /></DashboardLayout>;
}
