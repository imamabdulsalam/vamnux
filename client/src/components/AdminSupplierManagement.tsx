import { trpc } from "@/lib/trpc";
import { CheckCircle2, CirclePlus, Pencil, PlugZap, RefreshCw, Save, ShieldCheck, X } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import "./adminSupplierManagement.css";

type SupplierProfile = {
  id: number;
  supplierId: string;
  supplierName: string;
  websiteUrl: string | null;
  supportedCategories: string[];
  supportedCurrencies: string[];
  isActive: boolean;
  priority: number;
  apiStatus: string;
  connectionStatus: string;
  credentialConfigured: boolean;
  lastSuccessfulRequest: Date | string | null;
  lastFailedRequest: Date | string | null;
  lastFailureCode: string | null;
  successRate: number | null;
  failureRate: number | null;
  averageResponseMs: number | null;
  supplierBalance: number | null;
  supplierBalanceCurrency: string | null;
  supplierBalanceObservedAt: Date | string | null;
  lastHealthCheck: { status: string; detail: string; createdAt: Date | string; responseMs: number | null } | null;
};

const emptyDraft = { supplierId: "", supplierName: "", supportedCategories: "", supportedCurrencies: "USD", isActive: true, priority: "100" };
const display = (value: string) => value.replaceAll("_", " ");
const date = (value: Date | string | null) => value ? new Date(value).toLocaleString() : "No record yet";
const listFromDraft = (value: string) => value.split(",").map((part) => part.trim()).filter(Boolean);

export function AdminSupplierManagement() {
  const utils = trpc.useUtils();
  const supplierQuery = trpc.admin.listSupplierManagement.useQuery(undefined, { refetchOnWindowFocus: true });
  const [editing, setEditing] = useState<SupplierProfile | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [notice, setNotice] = useState<string | null>(null);

  const createProfile = trpc.admin.createSupplierManagementProfile.useMutation({
    onSuccess: async () => { setNotice("Supplier profile created. It is not connected to credentials, routing, products, or orders."); setCreating(false); setDraft(emptyDraft); await utils.admin.listSupplierManagement.invalidate(); },
    onError: (error) => setNotice(error.message),
  });
  const updateProfile = trpc.admin.updateSupplierManagementProfile.useMutation({
    onSuccess: async () => { setNotice("Supplier management profile saved. Existing supplier products and API relationships were not changed."); setEditing(null); await utils.admin.listSupplierManagement.invalidate(); },
    onError: (error) => setNotice(error.message),
  });
  const testConnection = trpc.admin.testSupplierManagementConnection.useMutation({
    onSuccess: async (result) => { setNotice(result.detail); await utils.admin.listSupplierManagement.invalidate(); },
    onError: (error) => setNotice(error.message),
  });

  const suppliers = useMemo(() => (supplierQuery.data ?? []) as SupplierProfile[], [supplierQuery.data]);
  const openEdit = (profile: SupplierProfile) => {
    setDraft({ supplierId: profile.supplierId, supplierName: profile.supplierName, supportedCategories: profile.supportedCategories.join(", "), supportedCurrencies: profile.supportedCurrencies.join(", ") || "USD", isActive: profile.isActive, priority: String(profile.priority) });
    setEditing(profile);
    setCreating(false);
  };
  const openCreate = () => { setDraft(emptyDraft); setEditing(null); setCreating(true); };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const payload = { supplierName: draft.supplierName, websiteUrl: editing?.websiteUrl ?? null, supportedCategories: listFromDraft(draft.supportedCategories), supportedCurrencies: listFromDraft(draft.supportedCurrencies), isActive: draft.isActive, priority: Number(draft.priority) || 100 };
    if (editing) updateProfile.mutate({ id: editing.id, ...payload });
    else createProfile.mutate({ supplierId: draft.supplierId, ...payload });
  };

  return <section className="supplier-management" aria-label="Supplier Management">
    <header className="supplier-management-header">
      <div><span>SUPPLIER MANAGEMENT</span><h2>Suppliers</h2><p>Manage supplier identity, status, supported categories, priority and safe configuration readiness. Supplier offers, customer prices, routing, orders and credentials remain unchanged.</p></div>
      <button type="button" className="admin-primary-action" onClick={openCreate}><CirclePlus size={16} /> Add supplier</button>
    </header>
    {notice && <div className="supplier-management-notice" role="status"><ShieldCheck size={16} /><span>{notice}</span><button type="button" onClick={() => setNotice(null)} aria-label="Dismiss message"><X size={15} /></button></div>}
    {(creating || editing) && <form className="supplier-profile-form" onSubmit={submit}>
      <div className="supplier-profile-form-head"><div><span>{editing ? "EDIT SUPPLIER PROFILE" : "ADD SUPPLIER PROFILE"}</span><h3>{editing ? editing.supplierName : "New supplier metadata"}</h3><p>Credentials are configured outside this form and never appear here.</p></div><button type="button" className="admin-secondary-action" onClick={() => { setCreating(false); setEditing(null); }}>Cancel</button></div>
      <div className="supplier-profile-fields">
        <label>Supplier ID<input value={draft.supplierId} disabled={Boolean(editing)} onChange={(event) => setDraft({ ...draft, supplierId: event.target.value })} required /></label>
        <label>Supplier name<input value={draft.supplierName} onChange={(event) => setDraft({ ...draft, supplierName: event.target.value })} required /></label>
        <label>Priority<input type="number" min="1" max="10000" value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value })} required /></label>
        <label>Supported categories <small>Comma separated</small><input value={draft.supportedCategories} onChange={(event) => setDraft({ ...draft, supportedCategories: event.target.value })} placeholder="top_up, gift_card" /></label>
      </div>
      <label className="supplier-active-toggle"><input type="checkbox" checked={draft.isActive} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} /> <span>Supplier profile active</span><small>This management status does not alter supplier product routing or integration credentials.</small></label>
      <button type="submit" className="admin-primary-action" disabled={createProfile.isPending || updateProfile.isPending}><Save size={16} /> {editing ? "Save supplier profile" : "Create supplier profile"}</button>
    </form>}
    {supplierQuery.isLoading ? <div className="admin-empty"><RefreshCw className="spin" size={22} /><p>Loading supplier management data…</p></div> : <div className="supplier-management-grid">
      {suppliers.map((supplier) => <article className="supplier-management-card" key={supplier.id}>
        <div className="supplier-management-card-head"><div><span>SUPPLIER · {supplier.supplierId}</span><h3>{supplier.supplierName}</h3></div><div className="supplier-card-statuses"><b className={supplier.isActive ? "good" : "muted"}>{supplier.isActive ? "Active" : "Inactive"}</b><b className={supplier.connectionStatus === "passed" ? "good" : supplier.connectionStatus === "attention" ? "attention" : "muted"}>{display(supplier.connectionStatus)}</b></div></div>
        <div className="supplier-management-meta"><span>API status <strong>{display(supplier.apiStatus)}</strong></span><span>Priority <strong>{supplier.priority}</strong></span><span>Credential reference <strong>{supplier.credentialConfigured ? "Configured server-side" : "Not configured"}</strong></span></div>
        <div className="supplier-management-chips"><div><small>Supported categories</small>{supplier.supportedCategories.length ? supplier.supportedCategories.map((category) => <em key={category}>{display(category)}</em>) : <em>None recorded</em>}</div></div>
        <div className="supplier-management-actions"><button type="button" className="admin-secondary-action" onClick={() => openEdit(supplier)}><Pencil size={14} /> Edit</button><button type="button" className="admin-secondary-action" disabled={testConnection.isPending} onClick={() => testConnection.mutate({ id: supplier.id })}><PlugZap size={14} /> {testConnection.isPending ? "Checking…" : "Test connection"}</button></div>
      </article>)}
    </div>}
    <footer className="supplier-management-boundary"><CheckCircle2 size={16} /> <span>Supplier Management does not route orders, change customer prices, alter product mappings, place supplier orders, or reveal credential values.</span></footer>
  </section>;
}
