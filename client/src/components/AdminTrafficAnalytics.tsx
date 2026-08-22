import { trpc } from "@/lib/trpc";
import { ChevronLeft, ChevronRight, UsersRound } from "lucide-react";
import { useState } from "react";
import "./adminTrafficAnalytics.css";

type TrafficWindow = "1d" | "3d" | "7d" | "14d" | "1m" | "3m" | "1y";

const periods: Array<{ value: TrafficWindow; label: string }> = [
  { value: "1d", label: "1 day" },
  { value: "3d", label: "3 days" },
  { value: "7d", label: "7 days" },
  { value: "14d", label: "2 weeks" },
  { value: "1m", label: "1 month" },
  { value: "3m", label: "3 months" },
  { value: "1y", label: "1 year" },
];

function money(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
}

export function AdminTrafficAnalytics() {
  const [window, setWindow] = useState<TrafficWindow>("1m");
  const analytics = trpc.admin.getTrafficAnalytics.useQuery({ window });
  const data = analytics.data;
  const periodIndex = periods.findIndex((period) => period.value === window);
  const shiftPeriod = (direction: -1 | 1) => setWindow(periods[Math.max(0, Math.min(periods.length - 1, periodIndex + direction))].value);
  const revenue = (values: Array<{ currency: string; total: number }>) => values.length ? values.map((value) => money(value.total, value.currency)).join(" · ") : money(0, "USD");
  const largestSource = Math.max(...(data?.sources.map((source) => source.signups) ?? [1]), 1);

  return <section className="admin-panel admin-traffic-analytics">
    <header>
      <div><span>TRAFFIC ANALYTICS</span><h2>Where customers are coming from</h2><p>{data?.note || "Loading stored VAMNUX registration attribution and paid-order records…"}</p></div>
      <div className="admin-traffic-period-control" aria-label="Traffic Analytics period">
        <button type="button" aria-label="Previous analytics period" disabled={periodIndex === 0} onClick={() => shiftPeriod(-1)}><ChevronLeft size={16} /></button>
        <select value={window} onChange={(event) => setWindow(event.target.value as TrafficWindow)}>{periods.map((period) => <option value={period.value} key={period.value}>{period.label}</option>)}</select>
        <button type="button" aria-label="Next analytics period" disabled={periodIndex === periods.length - 1} onClick={() => shiftPeriod(1)}><ChevronRight size={16} /></button>
      </div>
    </header>
    <section className="admin-traffic-metrics">
      <article><span>TOTAL SIGNUPS</span><strong>{data?.metrics.signups ?? "—"}</strong><small>Stored registrations in selected period</small></article>
      <article><span>PURCHASES</span><strong>{data?.metrics.purchases ?? "—"}</strong><small>Orders marked paid in selected period</small></article>
      <article><span>RECORDED REVENUE</span><strong>{data ? revenue(data.metrics.revenue) : "—"}</strong><small>Paid order totals; currencies are not converted</small></article>
    </section>
    <section className="admin-traffic-source-card">
      <div className="admin-traffic-source-heading"><div><span className="admin-form-kicker">SIGNUPS BY TRAFFIC SOURCE</span><h3>Registration attribution</h3></div><span>{data?.metrics.sourceCount ?? 0} recorded sources</span></div>
      {analytics.isLoading ? <p className="admin-traffic-empty">Loading source performance…</p> : data?.sources.length ? <div className="admin-traffic-source-list">{data.sources.map((source, index) => <article key={source.source}>
        <div className="admin-traffic-source-name"><i className={`source-tone-${index % 6}`} /><strong>{source.source}</strong></div>
        <div className="admin-traffic-bar" aria-label={`${source.source}: ${source.signupShare.toFixed(0)} percent of signups`}><span style={{ width: `${(source.signups / largestSource) * 100}%` }} className={`source-tone-${index % 6}`} /></div>
        <div className="admin-traffic-source-stats"><span>{source.signups} signups</span><span>{source.purchases} purchased</span><span>{revenue(source.revenue)}</span><span>{source.signupShare.toFixed(0)}%</span></div>
      </article>)}</div> : <p className="admin-traffic-empty">No stored registration-source or paid-order records exist for this period.</p>}
    </section>
    <section className="admin-traffic-country-card">
      <div><span className="admin-form-kicker">COUNTRY SUMMARY</span><h3>Registered account locations</h3></div>
      {data?.countries.length ? <div>{data.countries.map((country) => <p key={country.country}><strong>{country.country}</strong><span>{country.signups} signups · {country.signupShare.toFixed(0)}%</span></p>)}</div> : <p className="admin-traffic-empty">No country metadata exists for registrations in this period.</p>}
    </section>
  </section>;
}
