import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { ElectionSummary, TPSRecapItem, TPSStatus, ElectionSettings, Candidate, OfficerUser } from '../types/database.types';
import { MOCK_ELECTION, MOCK_TPS_RECAP, MOCK_CANDIDATES, DEFAULT_ELECTION_SETTINGS, MOCK_OFFICERS, calculateSummary } from '../lib/mockData';

// Cross-tab Realtime Sync Channel (Instant sync across browser tabs/windows on the same machine)
const syncChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('belega_quick_count_sync')
  : null;

const notifySync = () => {
  if (syncChannel) {
    try {
      syncChannel.postMessage({ type: 'DATA_SYNC', timestamp: Date.now() });
    } catch (_) {}
  }
};

export function useRealtimeResults(electionId: string = MOCK_ELECTION.id) {
  // 1. Election Settings State (Title, Subtitle, Organizer, Logo, Flash Count, Ticker)
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

  // 4. Officers List State
  const [officersList, setOfficersList] = useState<OfficerUser[]>(() => {
    const saved = localStorage.getItem('belega_officers');
    return saved ? JSON.parse(saved) : MOCK_OFFICERS;
  });

  // 5. Computed Summary
  const [summary, setSummary] = useState<ElectionSummary>(() => {
    return calculateSummary(tpsList, candidatesList);
  });

  const [isLive, setIsLive] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>(
    new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WITA'
  );

  const isFetchingRef = useRef(false);

  // Helper to re-calculate and trigger timestamp
  const recalculate = useCallback((currentTps: TPSRecapItem[], currentCandidates: Candidate[]) => {
    const newSummary = calculateSummary(currentTps, currentCandidates);
    setSummary(newSummary);
    setLastUpdated(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WITA');
  }, []);

  // --- FETCH RESULTS FROM SUPABASE / LOCAL ---
  const fetchResults = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (!isSupabaseConfigured) {
      const current = localStorage.getItem('belega_tps_recap');
      const list: TPSRecapItem[] = current ? JSON.parse(current) : MOCK_TPS_RECAP;
      
      const currentCandsStr = localStorage.getItem('belega_candidates');
      const currentCands: Candidate[] = currentCandsStr ? JSON.parse(currentCandsStr) : candidatesList;
      
      const currentSettingsStr = localStorage.getItem('belega_election_settings');
      if (currentSettingsStr) {
        setElectionSettings(JSON.parse(currentSettingsStr));
      }

      setCandidatesList(currentCands);
      setTpsList(list);
      recalculate(list, currentCands);
      isFetchingRef.current = false;
      return;
    }

    try {
      setLoading(true);

      // 1. Fetch Candidates from Supabase
      const { data: candData } = await supabase
        .from('candidates')
        .select('*')
        .order('number', { ascending: true });

      let currentCands = candidatesList;
      if (candData && candData.length > 0) {
        currentCands = candData as Candidate[];
        setCandidatesList(currentCands);
        localStorage.setItem('belega_candidates', JSON.stringify(currentCands));
      }

      // 2. Fetch Settings from Supabase
      const { data: settingsData } = await supabase
        .from('election_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (settingsData) {
        const mappedSettings: ElectionSettings = {
          title: settingsData.title || DEFAULT_ELECTION_SETTINGS.title,
          subtitle: settingsData.subtitle || DEFAULT_ELECTION_SETTINGS.subtitle,
          organizer: settingsData.organizer || DEFAULT_ELECTION_SETTINGS.organizer,
          logo_url: settingsData.logo_url || null,
          flash_count_text: settingsData.flash_count_text || 'FLASH COUNT',
          ticker_speed: settingsData.ticker_speed || 30
        };
        setElectionSettings(mappedSettings);
        localStorage.setItem('belega_election_settings', JSON.stringify(mappedSettings));
      }

      // 3. Fetch Officers (Profiles) from Supabase
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });

      if (profilesData && profilesData.length > 0) {
        const ops: OfficerUser[] = profilesData.map(p => ({
          id: p.id,
          full_name: p.full_name,
          email: p.email || '',
          phone: p.phone || '',
          tps_id: p.tps_id || '',
          role: (p.role === 'admin' ? 'admin' : 'operator') as any,
          created_at: p.created_at
        }));
        setOfficersList(ops);
        localStorage.setItem('belega_officers', JSON.stringify(ops));
      }

      // 4. Fetch Summary and Recap via RPC or tables
      const [summaryRes, recapRes] = await Promise.all([
        supabase.rpc('get_election_summary', { p_election_id: electionId }),
        supabase.rpc('get_tps_recap', { p_election_id: electionId })
      ]);

      let loadedTps = tpsList;

      if (recapRes.data && Array.isArray(recapRes.data) && recapRes.data.length > 0) {
        loadedTps = recapRes.data as TPSRecapItem[];
        setTpsList(loadedTps);
        localStorage.setItem('belega_tps_recap', JSON.stringify(loadedTps));
      } else {
        // Direct table fallback if RPC is not yet created
        const { data: psData } = await supabase
          .from('polling_stations')
          .select('*')
          .order('code', { ascending: true });

        if (psData && psData.length > 0) {
          const { data: vrData } = await supabase.from('vote_results').select('*');
          const { data: ivData } = await supabase.from('invalid_votes').select('*');

          const mappedTps: TPSRecapItem[] = psData.map(ps => {
            const tpsVotes = (vrData || []).filter(v => v.polling_station_id === ps.id);
            const invalidEntry = (ivData || []).find(iv => iv.polling_station_id === ps.id);
            const invalidCount = invalidEntry?.count || 0;

            const candVotesObj: Record<string, { candidate_id: string; votes: number; percentage: number }> = {};
            let totalValid = 0;

            currentCands.forEach(c => {
              const v = tpsVotes.find(tv => tv.candidate_id === c.id);
              const votes = v?.votes || 0;
              totalValid += votes;
              candVotesObj[String(c.number)] = {
                candidate_id: c.id,
                votes,
                percentage: 0
              };
            });

            currentCands.forEach(c => {
              const entry = candVotesObj[String(c.number)];
              if (entry) {
                entry.percentage = totalValid > 0 ? parseFloat(((entry.votes / totalValid) * 100).toFixed(1)) : 0;
              }
            });

            return {
              polling_station_id: ps.id,
              code: ps.code,
              banjar_name: ps.banjar_name,
              registered_voters: ps.registered_voters,
              status: ps.status,
              evidence_photo_url: ps.evidence_photo_url,
              total_valid_votes: totalValid,
              invalid_votes_count: invalidCount,
              candidate_votes: candVotesObj,
              leading_candidate_number: null,
              vote_margin: 0
            };
          });

          loadedTps = mappedTps;
          setTpsList(mappedTps);
          localStorage.setItem('belega_tps_recap', JSON.stringify(mappedTps));
        }
      }

      if (summaryRes.data) {
        setSummary(summaryRes.data as ElectionSummary);
      } else {
        recalculate(loadedTps, currentCands);
      }

      setLastUpdated(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WITA');
      setIsLive(true);
    } catch (err) {
      console.warn('Supabase fetch failed, falling back to local state:', err);
      setIsLive(false);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [electionId, candidatesList, recalculate]);

  // Initial Fetch & Realtime Subscription
  useEffect(() => {
    fetchResults();

    // 1. Cross-tab sync via BroadcastChannel
    const handleBroadcast = () => {
      fetchResults();
    };

    if (syncChannel) {
      syncChannel.addEventListener('message', handleBroadcast);
    }

    // 2. Storage event listener (when local storage changes across tabs)
    const handleStorage = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('belega_')) {
        fetchResults();
      }
    };
    window.addEventListener('storage', handleStorage);

    // 3. Supabase Realtime Subscription
    let channel: any = null;
    if (isSupabaseConfigured) {
      channel = supabase
        .channel('schema-db-changes')
        .on('postgres_changes', { event: '*', schema: 'public' }, () => {
          fetchResults();
        })
        .subscribe();
    }

    return () => {
      if (syncChannel) {
        syncChannel.removeEventListener('message', handleBroadcast);
      }
      window.removeEventListener('storage', handleStorage);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchResults]);

  // --- SETTINGS METHODS ---
  const updateSettings = useCallback(async (newSettings: Partial<ElectionSettings>) => {
    setElectionSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('belega_election_settings', JSON.stringify(updated));
      return updated;
    });

    if (isSupabaseConfigured) {
      try {
        const { data: existing } = await supabase
          .from('election_settings')
          .select('id')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existing?.id) {
          await supabase
            .from('election_settings')
            .update({
              title: newSettings.title,
              subtitle: newSettings.subtitle,
              organizer: newSettings.organizer,
              logo_url: newSettings.logo_url,
              flash_count_text: newSettings.flash_count_text,
              ticker_speed: newSettings.ticker_speed,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('election_settings')
            .insert({
              election_id: electionId,
              title: newSettings.title,
              subtitle: newSettings.subtitle,
              organizer: newSettings.organizer,
              logo_url: newSettings.logo_url,
              flash_count_text: newSettings.flash_count_text,
              ticker_speed: newSettings.ticker_speed,
              updated_at: new Date().toISOString()
            });
        }
      } catch (err) {
        console.error('Failed to save settings to Supabase:', err);
      }
    }
  }, [electionId]);

  // --- CANDIDATE CRUD METHODS ---
  const addCandidate = useCallback(async (candidate: Omit<Candidate, 'id' | 'election_id' | 'created_at'>) => {
    let candidateId = 'cand-' + Date.now();

    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase
          .from('candidates')
          .insert({
            election_id: electionId,
            number: candidate.number,
            name: candidate.name,
            vice_name: candidate.vice_name,
            photo_url: candidate.photo_url,
            color_hex: candidate.color_hex
          })
          .select()
          .single();

        if (data) {
          candidateId = data.id;
        }
      } catch (err) {
        console.warn('Supabase addCandidate fallback:', err);
      }
    }

    setCandidatesList(prev => {
      const newCand: Candidate = {
        id: candidateId,
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

  const updateCandidate = useCallback(async (id: string, updates: Partial<Candidate>) => {
    setCandidatesList(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, ...updates } : c).sort((a, b) => a.number - b.number);
      localStorage.setItem('belega_candidates', JSON.stringify(updated));
      recalculate(tpsList, updated);
      return updated;
    });

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('candidates')
          .update(updates)
          .eq('id', id);
      } catch (err) {
        console.error('Failed to update candidate on Supabase:', err);
      }
    }
  }, [tpsList, recalculate]);

  const deleteCandidate = useCallback(async (id: string) => {
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

    if (isSupabaseConfigured) {
      try {
        await supabase.from('candidates').delete().eq('id', id);
      } catch (err) {
        console.error('Failed to delete candidate on Supabase:', err);
      }
    }
  }, [recalculate]);

  // --- TPS CRUD METHODS ---
  const addTPS = useCallback(async (newTpsData: { code: string; banjar_name: string; registered_voters: number }) => {
    let tpsId = 'tps-' + Date.now();

    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase
          .from('polling_stations')
          .insert({
            election_id: electionId,
            code: newTpsData.code,
            banjar_name: newTpsData.banjar_name,
            registered_voters: newTpsData.registered_voters,
            status: 'pending'
          })
          .select()
          .single();

        if (data) {
          tpsId = data.id;
        }
      } catch (err) {
        console.warn('Supabase addTPS fallback:', err);
      }
    }

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
        polling_station_id: tpsId,
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
  }, [electionId, candidatesList, recalculate]);

  const updateTPSDetails = useCallback(async (tpsId: string, details: { code: string; banjar_name: string; registered_voters: number }) => {
    setTpsList(prev => {
      const updated = prev.map(item => item.polling_station_id === tpsId ? { ...item, ...details } : item);
      localStorage.setItem('belega_tps_recap', JSON.stringify(updated));
      recalculate(updated, candidatesList);
      return updated;
    });

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('polling_stations')
          .update(details)
          .eq('id', tpsId);
      } catch (err) {
        console.error('Failed to update TPS details on Supabase:', err);
      }
    }
  }, [candidatesList, recalculate]);

  const deleteTPS = useCallback(async (tpsId: string) => {
    setTpsList(prev => {
      const updated = prev.filter(item => item.polling_station_id !== tpsId);
      localStorage.setItem('belega_tps_recap', JSON.stringify(updated));
      recalculate(updated, candidatesList);
      return updated;
    });

    if (isSupabaseConfigured) {
      try {
        await supabase.from('polling_stations').delete().eq('id', tpsId);
      } catch (err) {
        console.error('Failed to delete TPS on Supabase:', err);
      }
    }
  }, [candidatesList, recalculate]);

  // Update votes & status for a TPS
  const updateTPSLocal = useCallback(async (
    tpsId: string,
    votes1: number,
    votes2: number,
    invalid: number,
    photoUrl?: string,
    newStatus?: TPSStatus
  ) => {
    const totalValid = votes1 + votes2;
    const leading = votes1 > votes2 ? 1 : votes2 > votes1 ? 2 : null;
    const margin = Math.abs(votes1 - votes2);
    const p1Pct = totalValid > 0 ? parseFloat(((votes1 / totalValid) * 100).toFixed(1)) : 0;
    const p2Pct = totalValid > 0 ? parseFloat(((votes2 / totalValid) * 100).toFixed(1)) : 0;

    setTpsList(prev => {
      const next = prev.map(item => {
        if (item.polling_station_id === tpsId) {
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
      notifySync();
      return next;
    });

    if (isSupabaseConfigured) {
      try {
        // 1. Update Polling Station status & photo
        await supabase
          .from('polling_stations')
          .update({
            status: newStatus || 'submitted',
            evidence_photo_url: photoUrl !== undefined ? photoUrl : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', tpsId);

        // 2. Upsert Candidate Votes
        if (candidatesList[0]) {
          await supabase.from('vote_results').upsert({
            polling_station_id: tpsId,
            candidate_id: candidatesList[0].id,
            votes: votes1,
            updated_at: new Date().toISOString()
          }, { onConflict: 'polling_station_id,candidate_id' });
        }

        if (candidatesList[1]) {
          await supabase.from('vote_results').upsert({
            polling_station_id: tpsId,
            candidate_id: candidatesList[1].id,
            votes: votes2,
            updated_at: new Date().toISOString()
          }, { onConflict: 'polling_station_id,candidate_id' });
        }

        // 3. Upsert Invalid Votes
        await supabase.from('invalid_votes').upsert({
          polling_station_id: tpsId,
          count: invalid,
          updated_at: new Date().toISOString()
        }, { onConflict: 'polling_station_id' });

      } catch (err) {
        console.error('Failed to write votes to Supabase:', err);
      }
    }
  }, [candidatesList, recalculate]);

  const updateTPSStatusLocal = useCallback(async (tpsId: string, status: TPSStatus) => {
    setTpsList(prev => {
      const next = prev.map(item => item.polling_station_id === tpsId ? { ...item, status } : item);
      localStorage.setItem('belega_tps_recap', JSON.stringify(next));
      recalculate(next, candidatesList);
      notifySync();
      return next;
    });

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('polling_stations')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', tpsId);
      } catch (err) {
        console.error('Failed to update status on Supabase:', err);
      }
    }
  }, [candidatesList, recalculate]);

  // --- OFFICER CRUD METHODS ---
  const addOfficer = useCallback(async (officerData: Omit<OfficerUser, 'id' | 'created_at'>) => {
    let officerId = 'off-' + Date.now();

    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase
          .from('profiles')
          .insert({
            full_name: officerData.full_name,
            email: officerData.email,
            phone: officerData.phone || '',
            tps_id: officerData.tps_id || null,
            role: 'operator'
          })
          .select()
          .single();

        if (data) {
          officerId = data.id;
        }
      } catch (err) {
        console.warn('Supabase addOfficer fallback:', err);
      }
    }

    setOfficersList(prev => {
      const newOff: OfficerUser = {
        id: officerId,
        full_name: officerData.full_name,
        email: officerData.email,
        password: officerData.password || 'password123',
        phone: officerData.phone || '',
        tps_id: officerData.tps_id,
        role: 'operator',
        created_at: new Date().toISOString()
      };
      const updated = [...prev, newOff];
      localStorage.setItem('belega_officers', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateOfficer = useCallback(async (id: string, updates: Partial<OfficerUser>) => {
    setOfficersList(prev => {
      const updated = prev.map(o => o.id === id ? { ...o, ...updates } : o);
      localStorage.setItem('belega_officers', JSON.stringify(updated));
      return updated;
    });

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('profiles')
          .update({
            full_name: updates.full_name,
            email: updates.email,
            phone: updates.phone,
            tps_id: updates.tps_id || null
          })
          .eq('id', id);
      } catch (err) {
        console.error('Failed to update officer on Supabase:', err);
      }
    }
  }, []);

  const deleteOfficer = useCallback(async (id: string) => {
    setOfficersList(prev => {
      const updated = prev.filter(o => o.id !== id);
      localStorage.setItem('belega_officers', JSON.stringify(updated));
      return updated;
    });

    if (isSupabaseConfigured) {
      try {
        await supabase.from('profiles').delete().eq('id', id);
      } catch (err) {
        console.error('Failed to delete officer on Supabase:', err);
      }
    }
  }, []);

  return {
    summary,
    tpsList,
    candidatesList,
    officersList,
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
    updateTPSStatusLocal,
    addOfficer,
    updateOfficer,
    deleteOfficer
  };
}
