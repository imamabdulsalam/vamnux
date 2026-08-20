import { trpc } from "@/lib/trpc";
import { ArrowLeft, FileText, ShieldAlert } from "lucide-react";
import { Link, useRoute } from "wouter";

const allowedSlugs = ["terms-of-service", "privacy-policy", "refund-policy", "cookie-policy"] as const;

export default function PolicyPage() {
  const [, params] = useRoute("/policies/:slug");
  const slug = allowedSlugs.includes(params?.slug as typeof allowedSlugs[number]) ? params?.slug as typeof allowedSlugs[number] : "terms-of-service";
  const page = trpc.marketplace.policyPage.useQuery({ slug });
  if (page.isLoading) return <main className="policy-page"><p>Loading VAMNUX policy content…</p></main>;
  if (!page.data) return <main className="policy-page"><ShieldAlert size={28} /><h1>Policy page unavailable</h1><Link href="/">Return to marketplace</Link></main>;
  return <main className="policy-page"><header><Link href="/"><ArrowLeft size={16} /> VAMNUX marketplace</Link></header><article><div className="policy-draft-notice"><ShieldAlert size={18} /><div><strong>Editable legal draft</strong><p>This content is a VAMNUX draft for owner and legal review. It is not represented as an approved legal policy.</p></div></div><div className="policy-title"><FileText size={24} /><div><span>{page.data.status} · {page.data.version}</span><h1>{page.data.title}</h1><p>Last updated {new Date(page.data.updatedAt).toLocaleDateString()}</p></div></div><div className="policy-body">{page.data.body.split("\n").map((line, index) => line.startsWith("# ") ? <h2 key={index}>{line.slice(2)}</h2> : line ? <p key={index}>{line.replaceAll("**", "")}</p> : <br key={index} />)}</div></article></main>;
}
