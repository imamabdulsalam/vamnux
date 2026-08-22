import { trpc } from "@/lib/trpc";
import { FileText, Save, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export function AdminPolicyManager() {
  const policies = trpc.admin.listPolicyPages.useQuery();
  const utils = trpc.useUtils();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const selected = useMemo(() => (policies.data ?? []).find((policy) => policy.slug === selectedSlug) ?? policies.data?.[0] ?? null, [policies.data, selectedSlug]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  useEffect(() => {
    if (!selectedSlug && policies.data?.[0]) setSelectedSlug(policies.data[0].slug);
  }, [policies.data, selectedSlug]);
  useEffect(() => {
    if (!selected) return;
    setTitle(selected.title);
    setBody(selected.body);
  }, [selected?.slug, selected?.title, selected?.body]);
  const save = trpc.admin.updatePolicyPage.useMutation({
    onSuccess: async (result) => {
      toast.success(`${result.title} updated.`);
      await Promise.all([utils.admin.listPolicyPages.invalidate(), utils.marketplace.policyPage.invalidate()]);
    },
    onError: (error) => toast.error(error.message),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    if (title.trim().length < 3 || body.trim().length < 30) { toast.error("Enter a complete policy title and content before saving."); return; }
    if (!window.confirm(`Save the customer-facing ${selected.title} page? This Admin action is audit logged.`)) return;
    save.mutate({ slug: selected.slug as "terms-of-service" | "privacy-policy" | "cookie-policy" | "refund-policy" | "payment-policy" | "delivery-policy" | "acceptable-use-policy", title: title.trim(), body: body.trim() });
  };
  return <section className="admin-panel admin-policy-manager"><header><div><span>POLICY MANAGEMENT</span><h2>Customer-facing legal pages</h2><p>Only Super Admin can edit these pages. Changes publish to the matching public policy route and are recorded in the Admin audit log.</p></div><FileText size={21} /></header><div className="admin-two-column"><aside className="admin-policy-list"><div><span className="admin-form-kicker">ALL POLICIES</span><strong>{policies.data?.length ?? 0} available</strong></div>{policies.isLoading ? <p>Loading policy pages…</p> : (policies.data ?? []).map((policy) => <button type="button" key={policy.slug} className={selected?.slug === policy.slug ? "active" : ""} onClick={() => setSelectedSlug(policy.slug)}><FileText size={15} /><span><strong>{policy.title}</strong><small>Updated {new Date(policy.updatedAt).toLocaleDateString()}</small></span></button>)}</aside><form className="admin-policy-editor" onSubmit={submit}>{!selected ? <p>Choose a policy to edit.</p> : <><div className="admin-policy-editor-head"><div><span className="admin-form-kicker">EDITING</span><h3>{selected.title}</h3><small>Public route: /{selected.slug === "terms-of-service" ? "terms" : selected.slug === "privacy-policy" ? "privacy" : selected.slug === "cookie-policy" ? "cookies" : selected.slug}</small></div><span className="admin-status good"><ShieldCheck size={13} /> Admin only</span></div><label>Policy title<input value={title} maxLength={180} onChange={(event) => setTitle(event.target.value)} required /></label><label>Policy content<textarea value={body} maxLength={50000} onChange={(event) => setBody(event.target.value)} rows={18} required /><small>{body.length.toLocaleString()} / 50,000 characters</small></label><div className="admin-funding-actions"><button type="button" className="admin-secondary-action" onClick={() => { setTitle(selected.title); setBody(selected.body); }}>Discard changes</button><button type="submit" className="admin-primary-action" disabled={save.isPending}>{save.isPending ? "Saving…" : <><Save size={15} /> Save policy</>}</button></div></>}</form></div></section>;
}
