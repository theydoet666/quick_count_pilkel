import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { ElectionSummary, TPSRecapItem, TPSStatus } from '../types/database.types';
import { MOCK_ELECTION, MOCK_TPS_RECAP, calculateSummary } from '../lib/mockData';

export function useRealtimeResults(electionId: string = MOCK_ELECTION.id) {
  const [tpsList, setTpsList] = useState<TPSRecapItem[]>(() => {
    const saved = localStorage.getItem('belega_tps_recap');
    return saved ? JSON.parse(saved) : MOCK_TPS_RECAP;
  });

  const [summary, setSummary] = useState<ElectionSummary>(() => {
    return calculateSummary(tpsList);
  });

  const [isLive, setIsLive] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>(
    new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WITA'
  );

  const fetchResults = useCallback(async () => {
    if (!isSupabaseConfigured) {
      // Local state fallback
      const current = localStorage.getItem('belega_tps_recap');
      const list: TPSRecapItem[] = current ? JSON.parse(current) : MOCK_TPS_RECAP;
      setTpsList(list);
      setSummary(calculateSummary(list));
      setLastUpdated(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WITA');
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
  }, [electionId]);

  // Update local storage whenever tpsList changes in fallback mode
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
              '1': { candidate_id: MOCK_ELECTION.id, votes: votes1, percentage: p1Pct },
              '2': { candidate_id: MOCK_ELECTION.id, votes: votes2, percentage: p2Pct }
            },
            leading_candidate_number: leading,
            vote_margin: margin
          };
        }
        return item;
      });

      localStorage.setItem('belega_tps_recap', JSON.stringify(next));
      setSummary(calculateSummary(next));
      setLastUpdated(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WITA');
      return next;
    });
  }, []);

  const updateTPSStatusLocal = useCallback((tpsId: string, status: TPSStatus) => {
    setTpsList(prev => {
      const next = prev.map(item => item.polling_station_id === tpsId ? { ...item, status } : item);
      localStorage.setItem('belega_tps_recap', JSON.stringify(next));
      setSummary(calculateSummary(next));
      setLastUpdated(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WITA');
      return next;
    });
  }, []);

  // Supabase Realtime Subscription Setup
  useEffect(() => {
    fetchResults();

    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel('election-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vote_results' }, () => {
        fetchResults();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'polling_stations' }, () => {
        fetchResults();
      })
      .subscribe((status) => {
        setIsLive(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchResults]);

  return {
    summary,
    tpsList,
    isLive,
    loading,
    lastUpdated,
    refresh: fetchResults,
    updateTPSLocal,
    updateTPSStatusLocal
  };
}
