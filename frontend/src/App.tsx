import { useState, useEffect } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { parseEther, formatEther } from "viem";
import { Flask, Scales, Gavel, ArrowsClockwise, CheckCircle, WarningCircle, PlusCircle, Key, Gear, BookOpen, ArrowLeft } from "@phosphor-icons/react";
import { Hero3D } from "./Hero3D";
import { BgGeo } from "./BgGeo";
import {
  submitStudy, evaluateRound, challenge, transferOwnership, upgradeCode,
  getStudy, getCounts, getPoolBalance, listAll, StudyView, StudyRow,
} from "./contractService";

type Hex = `0x${string}`;
const STATUS_LABEL = ["open", "canonized", "retracted"];
const STATUS_TAG = ["OPEN", "CANONIZED", "RETRACTED"];
const CH_LABEL = ["", "challenge pending", "challenge upheld", "challenge rejected"];
function shortAddr(a: string): string { return a && a.length > 12 ? `${a.slice(0, 6)}\u2026${a.slice(-4)}` : a || "-"; }
function gen(w: string): string { if (!w || w === "0") return "0"; try { const v = formatEther(BigInt(w)); const n = Number(v); return n >= 1 ? (Math.round(n * 1000) / 1000).toString() : v; } catch { return "0"; } }
function pct(c: number): number { return Math.round(c / 10); }

export function App() {
  const { address, isConnected } = useAccount();
  const acct = address as Hex | undefined;
  const initialView = (typeof window !== "undefined" && /about/.test(window.location.search + window.location.hash)) ? "about" : "app";
  const [view, setView] = useState<"app" | "about">(initialView as "app" | "about");
  const [showSub, setShowSub] = useState(false);
  const [field, setField] = useState(""); const [claims, setClaims] = useState(""); const [rawData, setRawData] = useState(""); const [analysisCode, setAnalysisCode] = useState(""); const [publication, setPublication] = useState(""); const [bond, setBond] = useState("");
  const [stake, setStake] = useState("");
  const [showAdmin, setShowAdmin] = useState(false); const [newOwner, setNewOwner] = useState(""); const [codeHex, setCodeHex] = useState("");
  const [rows, setRows] = useState<StudyRow[]>([]);
  const [counts, setCounts] = useState({ next: 0, canonized: 0, retracted: 0, challenges: 0, overturned: 0 });
  const [pool, setPool] = useState("0");
  const [selId, setSelId] = useState<number | null>(null); const [sel, setSel] = useState<StudyView | null>(null);
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState<string | null>(null); const [note, setNote] = useState(""); const [netErr, setNetErr] = useState(false);

  async function refreshAll() { if (typeof document !== "undefined" && document.hidden) return; try { const [c, p, l] = await Promise.all([getCounts(), getPoolBalance(), listAll(80)]); setCounts(c); setPool(p); setRows(l); if (selId != null) { try { setSel(await getStudy(selId)); } catch {} } setNetErr(false); } catch { setNetErr(true); } finally { setLoading(false); } }
  useEffect(() => { refreshAll(); const t = setInterval(refreshAll, 12000); const onVis = () => { if (!document.hidden) refreshAll(); }; document.addEventListener("visibilitychange", onVis); return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVis); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function pick(id: number) { setSelId(id); setStake(""); try { setSel(await getStudy(id)); } catch { setSel(null); } }
  async function run<T>(label: string, fn: () => Promise<T>): Promise<T | undefined> { setBusy(label); setNote(""); try { return await fn(); } catch (e) { setNote(String((e as Error).message || e).slice(0, 200)); return undefined; } finally { setBusy(null); refreshAll(); } }
  function buildClaims(): string { const lines = claims.split("\n").map(s => s.trim()).filter(Boolean); return JSON.stringify(lines.map((t, i) => ({ id: `c${i + 1}`, text: t }))); }
  async function onSub() {
    if (!acct) return;
    if (field.trim().length < 2) return setNote("Field required.");
    const lines = claims.split("\n").map(s => s.trim()).filter(Boolean);
    if (lines.length < 1) return setNote("Add at least one claim (one per line).");
    if (rawData.trim().length < 30) return setNote("Raw data 30+ chars.");
    if (publication.trim().length < 30) return setNote("Publication 30+ chars.");
    if (!(Number(bond) > 0)) return setNote("Bond in GEN.");
    const id = await run("Entering the crucible (staking bond)", () => submitStudy(acct!, { fieldLabel: field, claimsJson: buildClaims(), rawData, analysisCode, publication }, parseEther(bond.trim())));
    if (id != null) { setSelId(id); setField(""); setClaims(""); setRawData(""); setAnalysisCode(""); setPublication(""); setBond(""); setShowSub(false); }
  }
  async function onEvaluate() { if (acct && selId != null) await run("Tribunal round (prosecution / defense / judge)", () => evaluateRound(acct!, selId!)); }
  async function onChallenge() { if (!acct || selId == null) return; if (!(Number(stake) > 0)) return setNote("Stake in GEN to challenge."); await run("Filing a staked challenge", () => challenge(acct!, selId!, parseEther(stake.trim()))); setStake(""); }
  async function onTransfer() { if (!acct) return; if (!/^0x[0-9a-fA-F]{40}$/.test(newOwner.trim())) return setNote("Enter a valid new owner address."); await run("Transferring ownership", () => transferOwnership(acct!, newOwner)); setNewOwner(""); }
  async function onUpgrade() { if (!acct) return; if (codeHex.trim().length < 2) return setNote("Paste the new contract code as hex bytes."); await run("Upgrading contract code", () => upgradeCode(acct!, codeHex)); setCodeHex(""); }

  const tierClass = (t: string) => t === "REPLICATED" ? "SOUND" : t === "CONTESTED" ? "QUESTIONABLE" : "FABRICATED";
  const statClass = (st: number) => st === 1 ? "SOUND" : st === 2 ? "FABRICATED" : "pend";

  return (
    <div className="fs">
      <BgGeo />
      <div className="top">
        <div className="brand"><b>Veritae</b><span>replication crucible</span></div>
        <div className="top-r"><button className="lnk" onClick={() => setView(view === "app" ? "about" : "app")}>{view === "app" ? <><BookOpen size={13} weight="bold" /> How it works</> : <><ArrowLeft size={13} weight="bold" /> Back to app</>}</button><span className={`live ${netErr ? "off" : ""}`}><i />{netErr ? "reconnecting" : "studionet"}</span><ConnectButton showBalance={false} chainStatus="none" accountStatus="address" /></div>
      </div>

      {view === "app" && (<>
      <section className="hero">
        <Hero3D />
        <div className="hero-in">
          <p className="eyebrow">adversarial replication tribunal</p>
          <h1>Truth has to <em>survive attack.</em></h1>
          <p className="lede">Each round runs a three-pass tribunal &mdash; Prosecutor, Defense, Judge &mdash; over the study's claims. A credence builds across rounds and a claim is only CANONIZED after it survives a strong attack. Anyone can stake a challenge to force a high-rigor re-trial; a flip slashes the bond.</p>
          <p className="src">Claims, data, code and publication on-chain, judged via <code>gl.nondet</code>.</p>
        </div>
      </section>

      <div className="stats">
        <div className="stat"><b>{counts.next}</b><span>studies</span></div>
        <div className="stat"><b>{counts.canonized}</b><span>canonized</span></div>
        <div className="stat"><b>{counts.retracted}</b><span>retracted</span></div>
        <div className="stat"><b>{counts.overturned}<i>/{counts.challenges}</i></b><span>challenges won</span></div>
      </div>

      <div className="sec-h"><Flask size={17} weight="bold" /><h2>Studies</h2><span className="mut">submit / evaluate / challenge</span></div>
      {loading ? <div className="skel">{[0, 1, 2].map(i => <div key={i} className="sk" />)}</div>
        : rows.length === 0 ? <div className="empty">No studies in the crucible yet.</div>
          : <div className="mkts">{rows.map(r => (
            <button key={r.id} className={`mkt ${selId === r.id ? "on" : ""}`} onClick={() => pick(r.id)}>
              <div className="mkt-h"><span className="mkt-q">{r.fieldLabel} &middot; study #{r.id}</span><span className={`tag ${statClass(r.status)}`}>{STATUS_TAG[r.status] || "OPEN"}</span></div>
              <div className="credbar"><i style={{ width: `${pct(r.credence)}%` }} /></div>
              <div className="mkt-meta"><span className="mono">credence {pct(r.credence)}%</span><span className="mono">{r.rounds} rounds</span>{r.survivedAttack ? <span className="mono">survived attack</span> : null}<span className="mono">bond {gen(r.bond)} GEN</span></div>
            </button>))}</div>}

      {sel && selId != null && (
        <div className="panel">
          <div className="sec-h" style={{ marginTop: 0 }}><Scales size={16} weight="bold" /><h2>{sel.fieldLabel} &middot; #{selId}</h2><span className={`tag ${statClass(sel.status)}`}>{STATUS_TAG[sel.status] || "OPEN"}</span>{sel.challengeState > 0 ? <span className="tag pend">{CH_LABEL[sel.challengeState]}</span> : null}</div>
          <div className="credbar big"><i style={{ width: `${pct(sel.credence)}%` }} /></div>
          <div className="kv"><span>credence</span><b className="mono">{pct(sel.credence)}% &middot; {sel.rounds} rounds</b></div>
          <div className="kv"><span>survived a strong attack</span><b className="mono">{sel.survivedAttack ? "yes" : "no"} &middot; peak {pct(sel.attackPeak)}%</b></div>
          <div className="kv"><span>author</span><b className="mono">{shortAddr(sel.author)}</b></div>
          <div className="kv"><span>bond</span><b className="mono">{gen(sel.bond)} GEN</b></div>
          {sel.challengeState > 0 && <div className="kv"><span>challenger</span><b className="mono">{shortAddr(sel.challenger)} &middot; {gen(sel.challengeStake)} GEN</b></div>}
          {sel.verdicts.length > 0 && <div className="claims">{sel.verdicts.map((v, i) => (
            <div className="claim" key={i}><span className={`tag ${tierClass(v.tier)}`}>{v.tier.toLowerCase()}</span><span className="cid mono">{v.claim_id}</span><span className="cc mono">{pct(v.credence)}%</span></div>
          ))}</div>}
          {sel.prosecution && <div className="evid"><div className="l">prosecution</div><pre>{sel.prosecution}</pre></div>}
          {sel.defense && <div className="evid"><div className="l">defense</div><pre>{sel.defense}</pre></div>}
          {sel.rationale && <p className="why">{sel.rationale}</p>}
          {sel.publication && <div className="evid"><div className="l">publication</div><pre>{sel.publication}</pre></div>}
          <div className="actions">
            {sel.status !== 2 && <button className="btn" disabled={!isConnected || !!busy} onClick={onEvaluate}><ArrowsClockwise size={15} weight="bold" /> {sel.challengeState === 1 ? "Run high-rigor round" : "Run a tribunal round"}</button>}
            {sel.status !== 2 && sel.challengeState !== 1 && (
              <div className="defense-form" style={{ flex: 1, minWidth: 220 }}>
                <label>Challenge with a stake (GEN)</label>
                <div className="row2">
                  <input value={stake} onChange={e => setStake(e.target.value)} placeholder="e.g. 1" inputMode="decimal" />
                  <button className="btn ghost" disabled={!isConnected || !!busy} onClick={onChallenge}><Gavel size={15} weight="bold" /> Challenge</button>
                </div>
              </div>
            )}
            {sel.status === 1 && <p className="quiet"><CheckCircle size={15} weight="fill" /> Canonized after surviving attack. Bond returned to the author.</p>}
            {sel.status === 2 && <p className="quiet"><WarningCircle size={15} weight="fill" /> Retracted &middot; bond slashed{sel.challengeState === 2 ? " on a successful challenge" : ""}.</p>}
          </div>
        </div>
      )}

      <div className="sec-h"><PlusCircle size={17} weight="bold" /><h2>Enter the crucible</h2></div>
      {!showSub ? <button className="btn ghost" onClick={() => setShowSub(true)}><PlusCircle size={15} weight="bold" /> New study</button>
        : <div className="panel">
          <label>Field of study</label><input value={field} onChange={e => setField(e.target.value)} placeholder="e.g. clinical pharmacology" />
          <label>Claims (one per line)</label><textarea value={claims} onChange={e => setClaims(e.target.value)} placeholder={"Drug X lowers LDL by 30%\nEffect holds at 12 months\nNo serious adverse events"} />
          <label>Raw data (30+ chars)</label><textarea value={rawData} onChange={e => setRawData(e.target.value)} placeholder="Sample size, summary statistics, key figures." />
          <label>Analysis code / methodology</label><textarea value={analysisCode} onChange={e => setAnalysisCode(e.target.value)} placeholder="Pre-registration, code, model spec." />
          <label>Publication / preprint (30+ chars)</label><textarea value={publication} onChange={e => setPublication(e.target.value)} placeholder="Title, abstract, headline finding." />
          <label>Bond (GEN)</label><input value={bond} onChange={e => setBond(e.target.value)} placeholder="e.g. 1" inputMode="decimal" />
          <button className="btn" disabled={!isConnected || !!busy} onClick={onSub}>{isConnected ? "Stake and enter" : "Connect a wallet"}</button>
        </div>}

      <div className="sec-h"><Gear size={17} weight="bold" /><h2>Owner controls</h2><span className="mut">owner only &middot; rejected on-chain otherwise</span></div>
      {!showAdmin ? <button className="btn ghost" onClick={() => setShowAdmin(true)}><Key size={15} weight="bold" /> Open owner controls</button>
        : <div className="panel">
          <p className="quiet">These actions are restricted to the contract owner; any other wallet is reverted by the contract.</p>
          <label>Transfer ownership to</label>
          <div className="row2"><input value={newOwner} onChange={e => setNewOwner(e.target.value)} placeholder="0x... new owner" /><button className="btn ghost" disabled={!isConnected || !!busy} onClick={onTransfer}><Key size={15} weight="bold" /> Transfer</button></div>
          <label>Upgrade contract code (hex bytes &middot; advanced)</label>
          <textarea value={codeHex} onChange={e => setCodeHex(e.target.value)} placeholder="0x... compiled GenVM module bytes" />
          <button className="btn ghost" disabled={!isConnected || !!busy} onClick={onUpgrade}><ArrowsClockwise size={15} weight="bold" /> Upgrade code</button>
        </div>}
      </>)}

      {view === "about" && (
        <section className="about">
          <button className="btn ghost" onClick={() => setView("app")}><ArrowLeft size={15} weight="bold" /> Back to the app</button>
          <p className="eyebrow" style={{ marginTop: 22 }}>how veritae works</p>
          <h2 className="big">The replication crucible, end&nbsp;to&nbsp;end.</h2>
          <p className="lead">Veritae is an on-chain court where a scientific claim is not believed because it was published, but because it <em>survives</em> being attacked &mdash; repeatedly, by adversarial AI validators, over several rounds. Here is the whole machine, A to Z.</p>

          <div className="steps">
            <div className="step"><span className="n">01</span><div><h3>Submit under bond</h3><p>An author stakes a bond and enters a study: a field, the explicit claims (each pinned to a fixed id so judges always rule on the same keys), plus the raw data, the analysis code and the publication. The bond is what they are willing to lose if the work does not hold.</p></div></div>
            <div className="step"><span className="n">02</span><div><h3>The three-pass tribunal</h3><p>Each evaluation round runs three non-deterministic passes. A <b>Prosecutor</b> builds the strongest good-faith case that the study fails to replicate. A <b>Defense</b> rebuts it claim by claim. A <b>Judge</b> weighs both on the evidence and rules every claim REFUTED, CONTESTED or REPLICATED &mdash; with a credence, and a rating of how strong the attack itself was.</p></div></div>
            <div className="step"><span className="n">03</span><div><h3>Credence builds over rounds</h3><p>One pass is never the truth. A credence accumulates across rounds, with recent rounds weighing more. Validators only need to agree on the coarse outcome &mdash; which claims are REPLICATED &mdash; so heterogeneous models still finalize, while the decision stays real.</p></div></div>
            <div className="step"><span className="n">04</span><div><h3>Canonization = surviving the attack</h3><p>A study is CANONIZED only after it clears several rounds at high credence with every claim REPLICATED, <b>and</b> it has survived at least one round where the prosecution was genuinely strong. Survive a real attack, not a soft review. If credence collapses, the study is RETRACTED and the bond is slashed to the pool.</p></div></div>
            <div className="step"><span className="n">05</span><div><h3>The challenge market</h3><p>Anyone can stake GEN to challenge a ruling. A challenge forces a high-rigor re-trial. If the verdict flips, the challenger is rewarded from the slashed bond; if it holds, the challenger forfeits the stake. Falsification is paid for, frivolous noise is not.</p></div></div>
          </div>

          <div className="grid2">
            <div className="panel" style={{ marginTop: 0 }}>
              <div className="sec-h" style={{ marginTop: 0 }}><Scales size={16} weight="bold" /><h2>Why on-chain &amp; non-deterministic</h2></div>
              <p className="quiet" style={{ display: "block", lineHeight: 1.6 }}>The judgment runs through <code>gl.nondet</code>: validators independently re-judge and reach consensus on the coarse REPLICATED-set, never on free text or exact numbers. The consequences &mdash; credence update, canonization, slashing &mdash; are then computed deterministically on-chain. The LLM judges; the contract decides.</p>
            </div>
            <div className="panel" style={{ marginTop: 0 }}>
              <div className="sec-h" style={{ marginTop: 0 }}><BookOpen size={16} weight="bold" /><h2>The contract surface</h2></div>
              <div className="kv"><span>submit_study</span><b className="mono">stake + claims</b></div>
              <div className="kv"><span>evaluate_round</span><b className="mono">3-pass tribunal</b></div>
              <div className="kv"><span>challenge</span><b className="mono">staked re-trial</b></div>
              <div className="kv"><span>transfer_ownership / upgrade</span><b className="mono">owner only</b></div>
              <div className="kv"><span>get_study · get_study_ids · get_counts · get_pool_balance</span><b className="mono">views</b></div>
            </div>
          </div>

        </section>
      )}

      {netErr && <div className="strip"><WarningCircle size={14} weight="bold" /> Lost the studionet read; retrying every 12s.</div>}
      <div className="foot"><span>Veritae · on studionet</span><span>{netErr ? "reconnecting" : "live"}</span></div>
      {(busy || note) && <div className="toast">{busy ? `${busy}\u2026` : note}</div>}
    </div>
  );
}
