import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { ElectionSummary, TPSRecapItem, TPSStatus, ElectionSettings, Candidate } from '../types/database.types';
import { MOCK_ELECTION, MOCK_TPS_RECAP, MOCK_CANDIDATES, DEFAULT_ELECTION_SETTINGS, calculateSummary } from '../lib/mockData';

export function useRealtimeResults(electionId: string = MOCK_ELECTION.id) {
  // 1. Election Settings State (Title, Subtitle, Organizer, Logo)
  const [electionSettings, setElectionSettings] = useState<ElectionSettings>(() => {
    const saved = localStorage.getItem('belega_election_settings');
    return saved ? JSON.parse(saved) : DEFAULT_ELECTION_SETTINGS;
  });

  // 2. Candidates State
  const [candidatesList, setCandidatesList] = useState<Candidate[]>(() => {
    const saved = localStorage.getItem('belega_candidates');
    return saved ? JSON.parse(saved) : MOCK_CANDIDATES;
  });

  // 3. TPS Recap List State
  const [tpsList, setTpsList] = useState<TPSRecapItem[]>(() => {
    const saved = localStorage.getItem('belega_tps_recap');
    return saved ? JSON.parse(saved) : MOCK_TPS_RECAP;
  });

  // 4. Computed Summary
  const [summary, setSummary] = useState<ElectionSummary>(() => {
    return calculateSummary(tpsList, candidatesList);
  });

  const [isLive, setIsLive] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>(
    new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WITA'
  );

  // Helper to re-calculate and trigger timestamp
  const recalculate = useCallback((currentTps: TPSRecapItem[], currentCandidates: Candidate[]) => {
    const newSummary = calculateSummary(currentTps, currentCandidates);
    setSummary(newSummary);
    setLastUpdated(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WITA');
  }, []);

  // --- SETTINGS METHODS ---
  const updateSettings = useCallback((newSettings: Partial<ElectionSettings>) => {
    setElectionSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('belega_election_settings', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // --- CANDIDATE CRUD METHODS ---
  const addCandidate = useCallback((candidate: Omit<Candidate, 'id' | 'election_id' | 'created_at'>) => {
    setCandidatesList(prev => {
      const newCand: Candidate = {
        id: 'cand-' + Date.now(),
        election_id: electionId,
        number: candidate.number,
        name: candidate.name,
        vice_name: candidate.vice_name,
        photo_url: candidate.photo_url,
        color_hex: candidate.color_hex,
        created_at: new Date().toISOString()
      };
      const updated = [...prev, newCand].sort((a, b) => a.number - b.number);
      localStorage.setItem('belega_candidates', JSON.stringify(updated));

      // Also ensure TPS items have candidate vote entry
      setTpsList(prevTps => {
        const updatedTps = prevTps.map(t => ({
          ...t,
          candidate_votes: {
            ...t.candidate_votes,
            [String(newCand.number)]: t.candidate_votes[String(newCand.number)] || {
              candidate_id: newCand.id,
              votes: 0,
              percentage: 0
            }
          }
        }));
        localStorage.setItem('belega_tps_recap', JSON.stringify(updatedTps));
        recalculate(updatedTps, updated);
        return updatedTps;
      });

      return updated;
    });
  }, [electionId, recalculate]);

  const updateCandidate = useCallback((id: string, updates: Partial<Candidate>) => {
    setCandidatesList(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, ...updates } : c).sort((a, b) => a.number - b.number);
      localStorage.setItem('belega_candidates', JSON.stringify(updated));
      recalculate(tpsList, updated);
      return updated;
    });
  }, [tpsList, recalculate]);

  const deleteCandidate = useCallback((id: string) => {
    setCandidatesList(prev => {
      const candidateToDelete = prev.find(c => c.id === id);
      const updated = prev.filter(c => c.id !== id);
      localStorage.setItem('belega_candidates', JSON.stringify(updated));

      if (candidateToDelete) {
        setTpsList(prevTps => {
          const updatedTps = prevTps.map(t => {
            const nextVotes = { ...t.candidate_votes };
            delete nextVotes[String(candidateToDelete.number)];
            return {
              ...t,
              candidate_votes: nextVotes
            };
          });
          localStorage.setItem('belega_tps_recap', JSON.stringify(updatedTps));
          recalculate(updatedTps, updated);
          return updatedTps;
        });
      }

      return updated;
    });
  }, [recalculate]);

  // --- TPS CRUD METHODS ---
  const addTPS = useCallback((newTpsData: { code: string; banjar_name: string; registered_voters: number }) => {
    setTpsList(prev => {
      const candidateVotes: Record<string, { candidate_id: string; votes: number; percentage: number }> = {};
      candidatesList.forEach(c => {
        candidateVotes[String(c.number)] = {
          candidate_id: c.id,
          votes: 0,
          percentage: 0
        };
      });

      const newTps: TPSRecapItem = {
        polling_station_id: 'tps-' + Date.now(),
        code: newTpsData.code,
        banjar_name: newTpsData.banjar_name,
        registered_voters: newTpsData.registered_voters,
        status: 'pending',
        evidence_photo_url: null,
        total_valid_votes: 0,
        invalid_votes_count: 0,
        candidate_votes: candidateVotes,
        leading_candidate_number: null,
        vote_margin: 0
      };

      const updated = [...prev, newTps];
      localStorage.setItem('belega_tps_recap', JSON.stringify(updated));
      recalculate(updated, candidatesList);
      return updated;
    });
  }, [candidatesList, recalculate]);

  const updateTPSDetails = useCallback((tpsId: string, details: { code: string; banjar_name: string; registered_voters: number }) => {
    setTpsList(prev => {
      const updated = prev.map(item => item.polling_station_id === tpsId ? { ...item, ...details } : item);
      localStorage.setItem('belega_tps_recap', JSON.stringify(updated));
      recalculate(updated, candidatesList);
      return updated;
    });
  }, [candidatesList, recalculate]);

  const deleteTPS = useCallback((tpsId: string) => {
    setTpsList(prev => {
      const updated = prev.filter(item => item.polling_station_id !== tpsId);
      localStorage.setItem('belega_tps_recap', JSON.stringify(updated));
      recalculate(updated, candidatesList);
      return updated;
    });
  }, [candidatesList, recalculate]);

  // Update votes & status for a TPS
  const updateTPSLocal = useCallback((tpsId: string, votes1: number, votes2: number, invalid: number, photoUrl?: string, newStatus?: TPSStatus) => {
    setTpsList(prev => {
      const next = prev.map(item => {
        if (item.polling_station_id === tpsId) {
          const totalValid = votes1 + votes2;
          const leading = votes1 > votes2 ? 1 : votes2 > votes1 ? 2 : null;
          const margin = Math.abs(votes1 - votes2);
          const p1Pct = totalValid > 0 ? parseFloat(((votes1 / totalValid) * 100).toFixed(1)) : 0;
          const p2Pct = totalValid > 0 ? parseFloat(((votes2 / totalValid) * 100).toFixed(1)) : 0;

          return {
            ...item,
            status: newStatus || item.status,
            evidence_photo_url: photoUrl !== undefined ? photoUrl : item.evidence_photo_url,
            total_valid_votes: totalValid,
            invalid_votes_count: invalid,
            candidate_votes: {
              ...item.candidate_votes,
              '1': { candidate_id: candidatesList[0]?.id || '', votes: votes1, percentage: p1Pct },
              '2': { candidate_id: candidatesList[1]?.id || '', votes: votes2, percentage: p2Pct }
            },
            leading_candidate_number: leading,
            vote_margin: margin
          };
        }
        return item;
      });

      localStorage.setItem('belega_tps_recap', JSON.stringify(next));
      recalculate(next, candidatesList);
      return next;
    });
  }, [candidatesList, recalculate]);

  const updateTPSStatusLocal = useCallback((tpsId: string, status: TPSStatus) => {
    setTpsList(prev => {
      const next = prev.map(item => item.polling_station_id === tpsId ? { ...item, status } : item);
      localStorage.setItem('belega_tps_recap', JSON.stringify(next));
      recalculate(next, candidatesList);
      return next;
    });
  }, [candidatesList, recalculate]);

  const fetchResults = useCallback(async () => {
    if (!isSupabaseConfigured) {
      const current = localStorage.getItem('belega_tps_recap');
      const list: TPSRecapItem[] = current ? JSON.parse(current) : MOCK_TPS_RECAP;
      setTpsList(list);
      recalculate(list, candidatesList);
      return;
    }

    try {
      setLoading(true);
      const [summaryRes, recapRes] = await Promise.all([
        supabase.rpc('get_election_summary', { p_election_id: electionId }),
        supabase.rpc('get_tps_recap', { p_election_id: electionId })
      ]);

      if (summaryRes.data) {
        setSummary(summaryRes.data as ElectionSummary);
      }
      if (recapRes.data) {
        setTpsList(recapRes.data as TPSRecapItem[]);
      }
      setLastUpdated(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WITA');
      setIsLive(true);
    } catch (err) {
      console.warn('Supabase fetch failed, falling back to local state:', err);
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  }, [electionId, candidatesList, recalculate]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  return {
    summary,
    tpsList,
    candidatesList,
    electionSettings,
    isLive,
    loading,
    lastUpdated,
    refresh: fetchResults,
    updateSettings,
    addCandidate,
    updateCandidate,
    deleteCandidate,
    addTPS,
    updateTPSDetails,
    deleteTPS,
    updateTPSLocal,
    updateTPSStatusLocal
  };
}

