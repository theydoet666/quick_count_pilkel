import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { ElectionSummary, TPSRecapItem, TPSStatus, ElectionSettings, Candidate, OfficerUser, AuditLog, Profile } from '../types/database.types';
import { MOCK_ELECTION, MOCK_TPS_RECAP, MOCK_CANDIDATES, DEFAULT_ELECTION_SETTINGS, MOCK_OFFICERS, MOCK_AUDIT_LOGS, calculateSummary } from '../lib/mockData';
import { updateDynamicFavicon } from '../lib/dynamicFavicon';

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

  // 5. Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('belega_audit_logs');
    return saved ? JSON.parse(saved) : MOCK_AUDIT_LOGS;
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
        updateDynamicFavicon(mappedSettings.logo_url, `Hitung Cepat ${mappedSettings.title}`);
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
        // Also fetch additional_voters directly from polling_stations table in case RPC doesn't have it yet
        const { data: psAddData } = await supabase
          .from('polling_stations')
          .select('id, additional_voters, registered_voters');

        const addMap = new Map<string, number>();
        if (psAddData) {
          psAddData.forEach((p: any) => {
            if (p.additional_voters !== undefined && p.additional_voters !== null) {
              addMap.set(p.id, Number(p.additional_voters) || 0);
            }
          });
        }

        const savedCurrent = localStorage.getItem('belega_tps_recap');
        const savedList: TPSRecapItem[] = savedCurrent ? JSON.parse(savedCurrent) : [];

        loadedTps = (recapRes.data as TPSRecapItem[]).map(t => {
          const fromDb = addMap.get(t.polling_station_id);
          const fromSaved = savedList.find(s => s.polling_station_id === t.polling_station_id)?.additional_voters;
          return {
            ...t,
            additional_voters: fromDb !== undefined ? fromDb : (fromSaved !== undefined ? fromSaved : (t.additional_voters || 0))
          };
        });

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
              additional_voters: ps.additional_voters || 0,
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

      // 5. Fetch Audit Logs from Supabase
      const { data: auditData } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (auditData && auditData.length > 0) {
        setAuditLogs(auditData as AuditLog[]);
        localStorage.setItem('belega_audit_logs', JSON.stringify(auditData));
      }

      // Compute 100% accurate summary directly from loaded TPS list and candidates
      // This ensures total_dpt, total_additional_dpt (DPTb), and participation_rate are always synchronized with database data
      recalculate(loadedTps, currentCands);

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
      updateDynamicFavicon(updated.logo_url, `Hitung Cepat ${updated.title}`);
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
  const addTPS = useCallback(async (newTpsData: { code: string; banjar_name: string; registered_voters: number; additional_voters?: number }) => {
    let tpsId = 'tps-' + Date.now();

    if (isSupabaseConfigured) {
      try {
        const { data, error: insertErr } = await supabase
          .from('polling_stations')
          .insert({
            election_id: electionId,
            code: newTpsData.code,
            banjar_name: newTpsData.banjar_name,
            registered_voters: newTpsData.registered_voters,
            additional_voters: newTpsData.additional_voters || 0,
            status: 'pending'
          })
          .select()
          .single();

        if (data) {
          tpsId = data.id;
        } else if (insertErr) {
          // Retry without additional_voters
          const { data: retryData } = await supabase
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
          if (retryData) tpsId = retryData.id;
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
        additional_voters: newTpsData.additional_voters || 0,
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
      notifySync();
      return updated;
    });
  }, [electionId, candidatesList, recalculate]);

  // --- AUDIT LOGS HELPER ---
  const addAuditLog = useCallback(async (logData: Omit<AuditLog, 'id' | 'created_at'>) => {
    const newLog: AuditLog = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      ...logData,
      created_at: new Date().toISOString()
    };

    setAuditLogs(prev => {
      const updated = [newLog, ...prev];
      localStorage.setItem('belega_audit_logs', JSON.stringify(updated));
      return updated;
    });

    if (isSupabaseConfigured) {
      try {
        await supabase.from('audit_logs').insert({
          actor_id: logData.actor_id,
          action: logData.action,
          table_name: logData.table_name,
          record_id: logData.record_id,
          old_value: logData.old_value,
          new_value: logData.new_value,
          created_at: newLog.created_at
        });
      } catch (err) {
        console.warn('Supabase addAuditLog fallback:', err);
      }
    }
  }, []);

  const updateTPSDetails = useCallback(async (
    tpsId: string,
    details: { code: string; banjar_name: string; registered_voters: number; additional_voters?: number },
    actor?: { id?: string; full_name: string; role: string }
  ) => {
    const prevTps = tpsList.find(t => t.polling_station_id === tpsId);

    setTpsList(prev => {
      const updated = prev.map(t => {
        if (t.polling_station_id === tpsId) {
          return {
            ...t,
            code: details.code,
            banjar_name: details.banjar_name,
            registered_voters: details.registered_voters,
            additional_voters: details.additional_voters !== undefined ? details.additional_voters : (t.additional_voters || 0)
          };
        }
        return t;
      });
      localStorage.setItem('belega_tps_recap', JSON.stringify(updated));
      recalculate(updated, candidatesList);
      notifySync();
      return updated;
    });

    // Record audit log
    addAuditLog({
      actor_id: actor?.id || null,
      action: 'UPDATE_DATA_TPS',
      table_name: 'polling_stations',
      record_id: tpsId,
      old_value: prevTps ? {
        code: prevTps.code,
        banjar_name: prevTps.banjar_name,
        dpt_pokok: prevTps.registered_voters,
        dpt_tambahan: prevTps.additional_voters || 0
      } : null,
      new_value: {
        code: details.code,
        banjar_name: details.banjar_name,
        dpt_pokok: details.registered_voters,
        dpt_tambahan: details.additional_voters || 0
      },
      actor_profile: actor ? {
        id: actor.id || 'usr-temp',
        full_name: actor.full_name,
        role: (actor.role === 'admin' ? 'admin' : 'operator') as any,
        created_at: new Date().toISOString()
      } : null
    });

    if (isSupabaseConfigured) {
      try {
        if (details.additional_voters !== undefined) {
          const { error } = await supabase
            .from('polling_stations')
            .update(details)
            .eq('id', tpsId);

          if (error) {
            const { code, banjar_name, registered_voters } = details;
            await supabase
              .from('polling_stations')
              .update({ code, banjar_name, registered_voters })
              .eq('id', tpsId);
          }
        } else {
          const { code, banjar_name, registered_voters } = details;
          await supabase
            .from('polling_stations')
            .update({ code, banjar_name, registered_voters })
            .eq('id', tpsId);
        }
      } catch (err) {
        console.error('Failed to update TPS details on Supabase:', err);
      }
    }
  }, [tpsList, candidatesList, recalculate, addAuditLog]);

  const deleteTPS = useCallback(async (tpsId: string) => {
    setTpsList(prev => {
      const updated = prev.filter(item => item.polling_station_id !== tpsId);
      localStorage.setItem('belega_tps_recap', JSON.stringify(updated));
      recalculate(updated, candidatesList);
      notifySync();
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

  // Update votes, status, & additional_voters for a TPS
  const updateTPSLocal = useCallback(async (
    tpsId: string,
    votes1: number,
    votes2: number,
    invalid: number,
    photoUrl?: string,
    newStatus?: TPSStatus,
    additionalVoters?: number,
    actor?: { id?: string; full_name: string; role: string }
  ) => {
    const totalValid = votes1 + votes2;
    const leading = votes1 > votes2 ? 1 : votes2 > votes1 ? 2 : null;
    const margin = Math.abs(votes1 - votes2);
    const p1Pct = totalValid > 0 ? parseFloat(((votes1 / totalValid) * 100).toFixed(1)) : 0;
    const p2Pct = totalValid > 0 ? parseFloat(((votes2 / totalValid) * 100).toFixed(1)) : 0;

    const prevTps = tpsList.find(t => t.polling_station_id === tpsId);
    const isFirstInput = !prevTps || (prevTps.total_valid_votes === 0 && prevTps.invalid_votes_count === 0 && prevTps.status === 'pending');

    setTpsList(prev => {
      const next = prev.map(item => {
        if (item.polling_station_id === tpsId) {
          return {
            ...item,
            additional_voters: additionalVoters !== undefined ? additionalVoters : (item.additional_voters || 0),
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

    // Record audit log for vote change
    addAuditLog({
      actor_id: actor?.id || null,
      action: isFirstInput ? 'INPUT_SUARA' : 'UPDATE_SUARA',
      table_name: 'vote_results',
      record_id: tpsId,
      old_value: prevTps ? {
        paslon_01: prevTps.candidate_votes['1']?.votes || 0,
        paslon_02: prevTps.candidate_votes['2']?.votes || 0,
        tidak_sah: prevTps.invalid_votes_count || 0,
        total_suara: (prevTps.total_valid_votes || 0) + (prevTps.invalid_votes_count || 0),
        status: prevTps.status,
        has_photo: Boolean(prevTps.evidence_photo_url)
      } : null,
      new_value: {
        paslon_01: votes1,
        paslon_02: votes2,
        tidak_sah: invalid,
        total_suara: totalValid + invalid,
        status: newStatus || prevTps?.status || 'submitted',
        has_photo: Boolean(photoUrl || prevTps?.evidence_photo_url)
      },
      actor_profile: actor ? {
        id: actor.id || 'usr-temp',
        full_name: actor.full_name,
        role: (actor.role === 'admin' ? 'admin' : 'operator') as any,
        created_at: new Date().toISOString()
      } : null
    });

    if (isSupabaseConfigured) {
      try {
        // 1. Update Polling Station status, additional_voters & photo
        const psUpdatePayload: any = {
          status: newStatus || 'submitted',
          evidence_photo_url: photoUrl !== undefined ? photoUrl : null,
          updated_at: new Date().toISOString()
        };
        if (additionalVoters !== undefined) {
          psUpdatePayload.additional_voters = additionalVoters;
        }

        const { error: updateErr } = await supabase
          .from('polling_stations')
          .update(psUpdatePayload)
          .eq('id', tpsId);

        // Fallback retry if additional_voters column is not yet created in Supabase DB schema
        if (updateErr && additionalVoters !== undefined) {
          console.warn('Supabase polling_stations update with additional_voters failed (column might not exist in Supabase yet), retrying without additional_voters:', updateErr.message);
          const basicPayload = {
            status: newStatus || 'submitted',
            evidence_photo_url: photoUrl !== undefined ? photoUrl : null,
            updated_at: new Date().toISOString()
          };
          await supabase
            .from('polling_stations')
            .update(basicPayload)
            .eq('id', tpsId);
        }

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
  }, [candidatesList, recalculate, addAuditLog]);

  const updateTPSStatusLocal = useCallback(async (
    tpsId: string,
    status: TPSStatus,
    actor?: { id?: string; full_name: string; role: string }
  ) => {
    const prevTps = tpsList.find(t => t.polling_station_id === tpsId);

    setTpsList(prev => {
      const next = prev.map(item => item.polling_station_id === tpsId ? { ...item, status } : item);
      localStorage.setItem('belega_tps_recap', JSON.stringify(next));
      recalculate(next, candidatesList);
      notifySync();
      return next;
    });

    // Record audit log for status change
    const actionType = status === 'verified'
      ? 'VERIFIKASI_TPS'
      : status === 'locked'
      ? 'KUNCI_TPS'
      : 'BUKA_KUNCI_TPS';

    addAuditLog({
      actor_id: actor?.id || null,
      action: actionType,
      table_name: 'polling_stations',
      record_id: tpsId,
      old_value: { status: prevTps?.status || 'submitted' },
      new_value: { status },
      actor_profile: actor ? {
        id: actor.id || 'usr-temp',
        full_name: actor.full_name,
        role: (actor.role === 'admin' ? 'admin' : 'operator') as any,
        created_at: new Date().toISOString()
      } : null
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
  }, [tpsList, candidatesList, recalculate, addAuditLog]);

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
            role: officerData.role || 'operator'
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
        tps_id: officerData.tps_id || null,
        role: officerData.role || 'operator',
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
        const payload: any = {
          full_name: updates.full_name,
          email: updates.email,
          phone: updates.phone,
          tps_id: updates.tps_id || null
        };
        if (updates.role) {
          payload.role = updates.role;
        }
        await supabase
          .from('profiles')
          .update(payload)
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
    deleteOfficer,
    auditLogs,
    addAuditLog
  };
}
