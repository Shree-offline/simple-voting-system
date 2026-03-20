"use client";

import { useState, useCallback, useEffect } from "react";
import {
  addCandidate,
  vote,
  getVotes,
  getAllCandidates,
  CONTRACT_ADDRESS,
} from "@/hooks/contract";
import { AnimatedCard } from "@/components/ui/animated-card";
import { Spotlight } from "@/components/ui/spotlight";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ── Icons ────────────────────────────────────────────────────

function SpinnerIcon() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function UserPlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" x2="19" y1="8" y2="14" />
      <line x1="22" x2="16" y1="11" y2="11" />
    </svg>
  );
}

function VoteIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

// ── Styled Input ─────────────────────────────────────────────

function Input({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-2">
      <label className="block text-[11px] font-medium uppercase tracking-wider text-white/30">
        {label}
      </label>
      <div className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-px transition-all focus-within:border-[#7c6cf0]/30 focus-within:shadow-[0_0_20px_rgba(124,108,240,0.08)]">
        <input
          {...props}
          className="w-full rounded-[11px] bg-transparent px-4 py-3 font-mono text-sm text-white/90 placeholder:text-white/15 outline-none"
        />
      </div>
    </div>
  );
}

// ── Method Signature ─────────────────────────────────────────

function MethodSignature({
  name,
  params,
  returns,
  color,
}: {
  name: string;
  params: string;
  returns?: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3 font-mono text-sm">
      <span style={{ color }} className="font-semibold">fn</span>
      <span className="text-white/70">{name}</span>
      <span className="text-white/20 text-xs">{params}</span>
      {returns && (
        <span className="ml-auto text-white/15 text-[10px]">{returns}</span>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────

type Tab = "vote" | "add" | "results";

interface CandidateResult {
  name: string;
  votes: number;
}

interface ContractUIProps {
  walletAddress: string | null;
  onConnect: () => void;
  isConnecting: boolean;
}

export default function ContractUI({ walletAddress, onConnect, isConnecting }: ContractUIProps) {
  const [activeTab, setActiveTab] = useState<Tab>("vote");
  const [error, setError] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);

  const [candidateName, setCandidateName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const [voteCandidate, setVoteCandidate] = useState("");
  const [isVoting, setIsVoting] = useState(false);

  const [candidates, setCandidates] = useState<string[]>([]);
  const [results, setResults] = useState<CandidateResult[]>([]);
  const [isLoadingResults, setIsLoadingResults] = useState(false);

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const loadResults = useCallback(async () => {
    setIsLoadingResults(true);
    try {
      const allCandidates = await getAllCandidates() as string[] || [];
      const candidateResults: CandidateResult[] = [];
      
      for (const name of allCandidates) {
        const votes = await getVotes(name) as number || 0;
        candidateResults.push({ name, votes });
      }
      
      // Sort by votes descending
      candidateResults.sort((a, b) => b.votes - a.votes);
      setCandidates(allCandidates);
      setResults(candidateResults);
    } catch (err) {
      console.error("Failed to load results:", err);
    } finally {
      setIsLoadingResults(false);
    }
  }, []);

  // Load results on mount and tab switch
  useEffect(() => {
    if (activeTab === "results") {
      loadResults();
    }
  }, [activeTab, loadResults]);

  // Load candidates when vote tab is opened
  useEffect(() => {
    if (activeTab === "vote") {
      const loadCandidates = async () => {
        try {
          const allCandidates = await getAllCandidates() as string[] || [];
          setCandidates(allCandidates);
        } catch (err) {
          console.error("Failed to load candidates:", err);
        }
      };
      loadCandidates();
    }
  }, [activeTab]);

  const handleAddCandidate = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!candidateName.trim()) return setError("Enter candidate name");
    setError(null);
    setIsAdding(true);
    setTxStatus("Awaiting signature...");
    try {
      await addCandidate(walletAddress, candidateName.trim());
      setTxStatus("Candidate added on-chain!");
      setCandidateName("");
      // Refresh candidates list
      const allCandidates = await getAllCandidates() as string[] || [];
      setCandidates(allCandidates);
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsAdding(false);
    }
  }, [walletAddress, candidateName]);

  const handleVote = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!voteCandidate) return setError("Select a candidate to vote for");
    setError(null);
    setIsVoting(true);
    setTxStatus("Awaiting signature...");
    try {
      await vote(walletAddress, voteCandidate);
      setTxStatus("Vote cast on-chain!");
      setVoteCandidate("");
      // Refresh results
      await loadResults();
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsVoting(false);
    }
  }, [walletAddress, voteCandidate, loadResults]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode; color: string }[] = [
    { key: "vote", label: "Vote", icon: <VoteIcon />, color: "#34d399" },
    { key: "add", label: "Add Candidate", icon: <UserPlusIcon />, color: "#7c6cf0" },
    { key: "results", label: "Results", icon: <TrophyIcon />, color: "#fbbf24" },
  ];

  const maxVotes = results.length > 0 ? Math.max(...results.map(r => r.votes)) : 0;

  return (
    <div className="w-full max-w-2xl animate-fade-in-up-delayed">
      {/* Toasts */}
      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#f87171]/15 bg-[#f87171]/[0.05] px-4 py-3 backdrop-blur-sm animate-slide-down">
          <span className="mt-0.5 text-[#f87171]"><AlertIcon /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[#f87171]/90">Error</p>
            <p className="text-xs text-[#f87171]/50 mt-0.5 break-all">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="shrink-0 text-[#f87171]/30 hover:text-[#f87171]/70 text-lg leading-none">&times;</button>
        </div>
      )}

      {txStatus && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#34d399]/15 bg-[#34d399]/[0.05] px-4 py-3 backdrop-blur-sm shadow-[0_0_30px_rgba(52,211,153,0.05)] animate-slide-down">
          <span className="text-[#34d399]">
            {txStatus.includes("on-chain") || txStatus.includes("cast") ? <CheckIcon /> : <SpinnerIcon />}
          </span>
          <span className="text-sm text-[#34d399]/90">{txStatus}</span>
        </div>
      )}

      {/* Main Card */}
      <Spotlight className="rounded-2xl">
        <AnimatedCard className="p-0" containerClassName="rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#7c6cf0]/20 to-[#34d399]/20 border border-white/[0.06]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#34d399]">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white/90">Permissionless Voting</h3>
                <p className="text-[10px] text-white/25 font-mono mt-0.5">{truncate(CONTRACT_ADDRESS)}</p>
              </div>
            </div>
            <Badge variant="success">Open Poll</Badge>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/[0.06] px-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => { setActiveTab(t.key); setError(null); }}
                className={cn(
                  "relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all",
                  activeTab === t.key ? "text-white/90" : "text-white/35 hover:text-white/55"
                )}
              >
                <span style={activeTab === t.key ? { color: t.color } : undefined}>{t.icon}</span>
                {t.label}
                {activeTab === t.key && (
                  <span
                    className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full transition-all"
                    style={{ background: `linear-gradient(to right, ${t.color}, ${t.color}66)` }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Vote Tab */}
            {activeTab === "vote" && (
              <div className="space-y-5">
                <MethodSignature name="vote" params="(voter: Address, candidate: String)" returns="-> ()" color="#34d399" />
                
                {candidates.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] p-8 text-center">
                    <p className="text-sm text-white/40">No candidates yet.</p>
                    <p className="text-xs text-white/25 mt-1">Be the first to add one!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-white/30">Select Candidate</label>
                    <div className="grid grid-cols-2 gap-2">
                      {candidates.map((name) => (
                        <button
                          key={name}
                          onClick={() => setVoteCandidate(name)}
                          className={cn(
                            "rounded-xl border px-4 py-3 text-sm font-medium transition-all active:scale-95",
                            voteCandidate === name
                              ? "border-[#34d399]/40 bg-[#34d399]/10 text-[#34d399]"
                              : "border-white/[0.06] bg-white/[0.02] text-white/70 hover:text-white/90 hover:border-white/[0.1]"
                          )}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {walletAddress ? (
                  <ShimmerButton onClick={handleVote} disabled={isVoting || !voteCandidate} shimmerColor="#34d399" className="w-full">
                    {isVoting ? <><SpinnerIcon /> Casting Vote...</> : <><VoteIcon /> Cast Vote</>}
                  </ShimmerButton>
                ) : (
                  <button
                    onClick={onConnect}
                    disabled={isConnecting}
                    className="w-full rounded-xl border border-dashed border-[#34d399]/20 bg-[#34d399]/[0.03] py-4 text-sm text-[#34d399]/60 hover:border-[#34d399]/30 hover:text-[#34d399]/80 active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    Connect wallet to vote
                  </button>
                )}
              </div>
            )}

            {/* Add Candidate Tab */}
            {activeTab === "add" && (
              <div className="space-y-5">
                <MethodSignature name="add_candidate" params="(name: String)" color="#7c6cf0" />
                <Input 
                  label="Candidate Name" 
                  value={candidateName} 
                  onChange={(e) => setCandidateName(e.target.value)} 
                  placeholder="e.g. Alice, Bob, Charlie" 
                />
                {walletAddress ? (
                  <ShimmerButton onClick={handleAddCandidate} disabled={isAdding} shimmerColor="#7c6cf0" className="w-full">
                    {isAdding ? <><SpinnerIcon /> Adding...</> : <><UserPlusIcon /> Add Candidate</>}
                  </ShimmerButton>
                ) : (
                  <button
                    onClick={onConnect}
                    disabled={isConnecting}
                    className="w-full rounded-xl border border-dashed border-[#7c6cf0]/20 bg-[#7c6cf0]/[0.03] py-4 text-sm text-[#7c6cf0]/60 hover:border-[#7c6cf0]/30 hover:text-[#7c6cf0]/80 active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    Connect wallet to add candidate
                  </button>
                )}
              </div>
            )}

            {/* Results Tab */}
            {activeTab === "results" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <MethodSignature name="get_all_candidates" params="()" returns="-> Vec<String>" color="#fbbf24" />
                  <button
                    onClick={loadResults}
                    disabled={isLoadingResults}
                    className="p-2 rounded-lg border border-white/[0.06] bg-white/[0.02] text-white/40 hover:text-white/70 hover:border-white/[0.1] transition-all disabled:opacity-50"
                  >
                    <RefreshIcon />
                  </button>
                </div>

                {isLoadingResults ? (
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
                    <SpinnerIcon />
                    <p className="text-sm text-white/40 mt-2">Loading results...</p>
                  </div>
                ) : results.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] p-8 text-center">
                    <p className="text-sm text-white/40">No candidates yet.</p>
                    <p className="text-xs text-white/25 mt-1">Add candidates to start the poll!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {results.map((result, index) => (
                      <div key={result.name} className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                        <div className="px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className={cn(
                              "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                              index === 0 ? "bg-[#fbbf24]/20 text-[#fbbf24]" :
                              index === 1 ? "bg-white/10 text-white/60" :
                              index === 2 ? "bg-[#cd7f32]/20 text-[#cd7f32]" :
                              "bg-white/5 text-white/30"
                            )}>
                              {index + 1}
                            </span>
                            <span className="text-sm text-white/80">{result.name}</span>
                          </div>
                          <Badge variant={index === 0 ? "warning" : "info"}>
                            {result.votes} vote{result.votes !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                        <div className="h-1 bg-white/[0.02]">
                          <div 
                            className={cn(
                              "h-full transition-all duration-500",
                              index === 0 ? "bg-[#fbbf24]" :
                              index === 1 ? "bg-white/40" :
                              index === 2 ? "bg-[#cd7f32]" :
                              "bg-[#7c6cf0]/40"
                            )}
                            style={{ width: maxVotes > 0 ? `${(result.votes / maxVotes) * 100}%` : "0%" }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-white/[0.04] px-6 py-3 flex items-center justify-between">
            <p className="text-[10px] text-white/15">Permissionless Voting &middot; Soroban</p>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#34d399]" />
              <span className="font-mono text-[9px] text-white/15">One vote per wallet</span>
            </div>
          </div>
        </AnimatedCard>
      </Spotlight>
    </div>
  );
}
