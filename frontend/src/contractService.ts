import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import { CONTRACT_ADDRESS } from "./chain";

type Hex = `0x${string}`;
const TIMEOUT_MS = 240_000;

// status: 0 OPEN, 1 CANONIZED, 2 RETRACTED
// challengeState: 0 NONE, 1 PENDING, 2 UPHELD, 3 REJECTED
export interface ClaimVerdict { claim_id: string; tier: string; credence: number; }
export interface StudyView {
  author: string;
  fieldLabel: string;
  claimsJson: string;
  rawData: string;
  analysisCode: string;
  publication: string;
  bond: string;
  status: number;
  rounds: number;
  survivedAttack: number;
  credence: number;
  attackPeak: number;
  verdicts: ClaimVerdict[];
  prosecution: string;
  defense: string;
  rationale: string;
  challenger: string;
  challengeStake: string;
  preCredence: number;
  challengeState: number;
}
export interface StudyRow extends StudyView { id: number; }

function readClient() { return createClient({ chain: studionet, account: createAccount() }); }
function writeClient(account: Hex) { return createClient({ chain: studionet, account }); }
async function waitAccepted(client: any, hash: Hex) { let timer: ReturnType<typeof setTimeout> | undefined; const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Transaction timed out")), TIMEOUT_MS); }); try { await Promise.race([client.waitForTransactionReceipt({ hash: hash as never, status: TransactionStatus.ACCEPTED, interval: 5000, retries: 64 }), timeout]); } finally { if (timer) clearTimeout(timer); } }
function pick(obj: any, key: string, idx: number): any { if (obj == null) return undefined; if (Array.isArray(obj)) return obj[idx]; if (typeof obj === "object" && key in obj) return obj[key]; return undefined; }
function parseVerdicts(s: string): ClaimVerdict[] { try { const a = JSON.parse(s || "[]"); return Array.isArray(a) ? a.map((v: any) => ({ claim_id: String(v.claim_id ?? ""), tier: String(v.tier ?? ""), credence: Number(v.credence ?? 0) })) : []; } catch { return []; } }
async function send(account: Hex, fn: string, args: any[], value: bigint = 0n): Promise<void> {
  const wc = writeClient(account);
  const h = (await wc.writeContract({ address: CONTRACT_ADDRESS as Hex, functionName: fn, args, value })) as Hex;
  await waitAccepted(wc, h);
}

export async function submitStudy(account: Hex, f: { fieldLabel: string; claimsJson: string; rawData: string; analysisCode: string; publication: string }, bond: bigint): Promise<number> {
  if (bond <= 0n) throw new Error("Bond must be > 0");
  await send(account, "submit_study", [f.fieldLabel.trim(), f.claimsJson.trim(), f.rawData.trim(), f.analysisCode.trim(), f.publication.trim()], bond);
  const c = await getCounts(); return c.next - 1;
}
export async function evaluateRound(account: Hex, id: number): Promise<void> { await send(account, "evaluate_round", [id]); }
export async function challenge(account: Hex, id: number, stake: bigint): Promise<void> { if (stake <= 0n) throw new Error("Stake must be > 0"); await send(account, "challenge", [id], stake); }
export async function transferOwnership(account: Hex, newOwner: string): Promise<void> { await send(account, "transfer_ownership", [newOwner.trim()]); }
export async function upgradeCode(account: Hex, hex: string): Promise<void> {
  const clean = hex.trim().replace(/^0x/, "");
  if (clean.length === 0 || clean.length % 2 !== 0) throw new Error("Code must be a non-empty even-length hex string");
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
  await send(account, "upgrade", [bytes]);
}
export async function getStudyIds(): Promise<number[]> {
  const r: any = await readClient().readContract({ address: CONTRACT_ADDRESS as Hex, functionName: "get_study_ids", args: [] });
  return Array.isArray(r) ? r.map((x: any) => Number(x)) : [];
}

export async function getStudy(id: number): Promise<StudyView> {
  const r: any = await readClient().readContract({ address: CONTRACT_ADDRESS as Hex, functionName: "get_study", args: [id] });
  return {
    author: String(pick(r, "author", 0) ?? ""),
    fieldLabel: String(pick(r, "field_label", 1) ?? ""),
    claimsJson: String(pick(r, "claims_json", 2) ?? ""),
    rawData: String(pick(r, "raw_data", 3) ?? ""),
    analysisCode: String(pick(r, "analysis_code", 4) ?? ""),
    publication: String(pick(r, "publication", 5) ?? ""),
    bond: String(pick(r, "bond", 6) ?? "0"),
    status: Number(pick(r, "status", 7) ?? 0),
    rounds: Number(pick(r, "rounds", 8) ?? 0),
    survivedAttack: Number(pick(r, "survived_attack", 9) ?? 0),
    credence: Number(pick(r, "credence", 10) ?? 0),
    attackPeak: Number(pick(r, "attack_peak", 11) ?? 0),
    verdicts: parseVerdicts(String(pick(r, "verdicts_json", 12) ?? "")),
    prosecution: String(pick(r, "prosecution", 13) ?? ""),
    defense: String(pick(r, "defense", 14) ?? ""),
    rationale: String(pick(r, "rationale", 15) ?? ""),
    challenger: String(pick(r, "challenger", 16) ?? ""),
    challengeStake: String(pick(r, "challenge_stake", 17) ?? "0"),
    preCredence: Number(pick(r, "pre_credence", 18) ?? 0),
    challengeState: Number(pick(r, "challenge_state", 19) ?? 0),
  };
}
export async function getCounts(): Promise<{ next: number; canonized: number; retracted: number; challenges: number; overturned: number }> {
  const r: any = await readClient().readContract({ address: CONTRACT_ADDRESS as Hex, functionName: "get_counts", args: [] });
  const p = String(r).split("||").map((x) => Number(x) || 0);
  return { next: p[0] || 0, canonized: p[1] || 0, retracted: p[2] || 0, challenges: p[3] || 0, overturned: p[4] || 0 };
}
export async function getPoolBalance(): Promise<string> { const r: any = await readClient().readContract({ address: CONTRACT_ADDRESS as Hex, functionName: "get_pool_balance", args: [] }); return String(r ?? "0"); }
export async function listAll(maxRows = 80): Promise<StudyRow[]> {
  let ids: number[] = [];
  try { ids = await getStudyIds(); } catch { /* fallback below */ }
  if (ids.length === 0) { const { next } = await getCounts(); if (next === 0) return []; for (let i = next - 1; i >= 0; i--) ids.push(i); }
  ids = ids.slice(-maxRows).sort((a, b) => b - a);
  const rows = await Promise.all(ids.map(async (id) => { try { const c = await getStudy(id); return { id, ...c }; } catch { return null; } }));
  return rows.filter((r): r is StudyRow => r !== null);
}
