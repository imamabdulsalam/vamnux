import { AlertTriangle, ArrowRight, BadgeCheck, Braces, DatabaseZap, Loader2, ShieldCheck, SlidersHorizontal, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import "./adminSupplierInputAdapter.css";

type Profile = {
  pairId: string;
  displayName: string;
  market: "GLOBAL" | "RUSSIA";
  denomination: string;
  canonicalProductId: string;
  flashTopUp: { legacyProductId: number; serviceCode: string; validationCode: string; supplierOfferId: string; supplierFieldNames: string[] };
  gamesDrop: { legacyProductId: number; offerId: number; supplierFieldNames: string[] };
};

type CanonicalInput = { gameUserId: string; serverId: string; region: "GLOBAL" | "RUSSIA"; productId: string; denomination: string };
type Preview = {
  mode: "SIMULATION_ONLY";
  canonicalInput: CanonicalInput;
  validationIssues: ReadonlyArray<{ field: string; message: string; severity: "error" | "warning" }>;
  canProceedToFuturePreflight: boolean;
  liveRequestBlocked: true;
  supplierPreflight: { flashtopup: readonly string[]; gamesdrop: readonly string[] };
  requestPreviews: { flashtopup: { endpoint: string; body: unknown }; gamesdrop: { endpoint: string; body: unknown } };
  responseMappings: { flashtopup: readonly string[]; gamesdrop: readonly string[] };
  adminErrorVisibility: string;
};

const emptyInput: CanonicalInput = { gameUserId: "", serverId: "", region: "GLOBAL", productId: "", denomination: "" };

export function AdminSupplierInputAdapter() {
  const profilesQuery = trpc.admin.listSupplierInputAdapterProfiles.useQuery(undefined, { refetchOnWindowFocus: true });
  const [pairId, setPairId] = useState("");
  const [input, setInput] = useState(emptyInput);
  const [preview, setPreview] = useState<Preview | null>(null);
  const profiles = (profilesQuery.data?.profiles ?? []) as readonly Profile[];
  const selectedProfile = useMemo(() => profiles.find((profile) => profile.pairId === pairId) ?? null, [profiles, pairId]);
  const previewMutation = trpc.admin.previewSupplierInputAdapter.useMutation({
    onSuccess: (result) => setPreview(result as unknown as Preview),
    onError: (error) => setPreview(null),
  });

  useEffect(() => {
    if (!pairId && profiles[0]) setPairId(profiles[0].pairId);
  }, [pairId, profiles]);

  useEffect(() => {
    if (!selectedProfile) return;
    setInput((current) => ({ ...current, region: selectedProfile.market, productId: selectedProfile.canonicalProductId, denomination: selectedProfile.denomination }));
    setPreview(null);
  }, [selectedProfile?.pairId]);

  const update = (field: keyof typeof input, value: string) => setInput((current) => ({ ...current, [field]: value }));
  const runPreview = () => {
    if (!selectedProfile) return;
    previewMutation.mutate({ pairId: selectedProfile.pairId, canonicalInput: input });
  };

  return <section className="supplier-adapter" aria-label="Supplier Input Adapter Simulator">
    <header className="supplier-adapter-header"><div><span>STEP 10C · SUPPLIER INPUT ADAPTER</span><h2>Mobile Legends adapter simulation</h2><p>Convert canonical VAMNUX input into supplier-specific request previews for the 20 reviewed pairs. This workspace has no live endpoint, no order submission, and no catalog mapping action.</p></div><SlidersHorizontal size={25} /></header>
    <section className="supplier-adapter-boundary"><ShieldCheck size={18} /><div><strong>SIMULATION ONLY · LIVE ACTIONS BLOCKED</strong><p>Supplier API calls, player validation, server discovery, order submission, routing, fulfillment, pricing, mapping, and all customer or wallet actions remain disabled. The preview never reads or emits credentials.</p></div></section>

    <section className="supplier-adapter-profiles"><div className="supplier-adapter-heading"><div><span>REVIEWED ADAPTER PROFILES</span><h3>Twenty controlled Mobile Legends pairs</h3><p>Each profile preserves both supplier source identities without creating a Master Product or Supplier Offer.</p></div><DatabaseZap size={20} /></div>{profilesQuery.isLoading ? <div className="supplier-adapter-loading"><Loader2 className="spin" size={17} /> Loading approved-for-planning profiles…</div> : <div className="supplier-adapter-select"><label>Adapter profile<select value={pairId} onChange={(event) => setPairId(event.target.value)}>{profiles.map((profile) => <option key={profile.pairId} value={profile.pairId}>{profile.displayName} · {profile.market}</option>)}</select></label>{selectedProfile && <div className="supplier-adapter-source-grid"><article><span>FlashTopUp</span><strong>Existing product #{selectedProfile.flashTopUp.legacyProductId}</strong><small>Service code and original field names are preserved.</small></article><article><span>GamesDrop</span><strong>Existing product #{selectedProfile.gamesDrop.legacyProductId}</strong><small>Offer ID {selectedProfile.gamesDrop.offerId}; current offer metadata must be preflighted later.</small></article></div>}</div>}</section>

    {selectedProfile && <section className="supplier-adapter-form"><div className="supplier-adapter-heading"><div><span>CANONICAL VAMNUX INPUT</span><h3>Enter a simulation payload</h3><p>The player and server values are intentionally not assumed to be interchangeable. Enter values only for a local preview; nothing is sent to either supplier.</p></div><Braces size={20} /></div><div className="supplier-adapter-form-grid"><label>gameUserId<input value={input.gameUserId} onChange={(event) => update("gameUserId", event.target.value)} maxLength={80} placeholder="Player identifier" autoComplete="off" /></label><label>serverId<input value={input.serverId} onChange={(event) => update("serverId", event.target.value)} maxLength={80} placeholder="Server or zone identifier" autoComplete="off" /></label><label>region<input value={input.region} readOnly aria-readonly="true" /></label><label>productId<input value={input.productId} readOnly aria-readonly="true" /></label><label>denomination<input value={input.denomination} readOnly aria-readonly="true" /></label></div><button type="button" className="admin-primary-action" disabled={!input.gameUserId.trim() || !input.serverId.trim() || previewMutation.isPending} onClick={runPreview}>{previewMutation.isPending ? <Loader2 className="spin" size={15} /> : <ArrowRight size={15} />} Generate simulation preview</button></section>}

    {preview && <section className="supplier-adapter-preview"><div className="supplier-adapter-heading"><div><span>ADAPTER OUTPUT</span><h3>Validation, normalized request, and status handling</h3><p>The generated payloads are visibly marked as simulation-only. Future live use requires separately approved server discovery, player validation, regional checks, latest supplier price retrieval, and live-order testing.</p></div><BadgeCheck size={20} /></div><div className="supplier-adapter-result"><span className={preview.canProceedToFuturePreflight ? "adapter-result-ready" : "adapter-result-blocked"}>{preview.canProceedToFuturePreflight ? "READY FOR FUTURE PREFLIGHT ONLY" : "BLOCKED BY INPUT VALIDATION"}</span><span>Live request blocked: {String(preview.liveRequestBlocked)}</span></div><div className="supplier-adapter-issues">{preview.validationIssues.map((issue, index) => <article key={`${issue.field}-${index}`} className={issue.severity === "error" ? "adapter-issue-error" : "adapter-issue-warning"}>{issue.severity === "error" ? <XCircle size={15} /> : <AlertTriangle size={15} />}<div><strong>{issue.field}</strong><p>{issue.message}</p></div></article>)}</div><div className="supplier-adapter-request-grid"><AdapterRequest title="FlashTopUp request preview" endpoint={preview.requestPreviews.flashtopup.endpoint} body={preview.requestPreviews.flashtopup.body} preflight={preview.supplierPreflight.flashtopup} mappings={preview.responseMappings.flashtopup} /><AdapterRequest title="GamesDrop request preview" endpoint={preview.requestPreviews.gamesdrop.endpoint} body={preview.requestPreviews.gamesdrop.body} preflight={preview.supplierPreflight.gamesdrop} mappings={preview.responseMappings.gamesdrop} /></div><div className="supplier-adapter-admin-note"><ShieldCheck size={16} /><p><strong>Admin error visibility:</strong> {preview.adminErrorVisibility}</p></div></section>}
  </section>;
}

function AdapterRequest({ title, endpoint, body, preflight, mappings }: { title: string; endpoint: string; body: unknown; preflight: readonly string[]; mappings: readonly string[] }) {
  return <article className="supplier-adapter-request"><h4>{title}</h4><p className="supplier-adapter-endpoint">{endpoint}</p><pre>{JSON.stringify(body, null, 2)}</pre><h5>Required future preflight</h5><ul>{preflight.map((item) => <li key={item}>{item}</li>)}</ul><h5>Expected VAMNUX status mapping</h5><ul>{mappings.map((item) => <li key={item}>{item}</li>)}</ul></article>;
}
