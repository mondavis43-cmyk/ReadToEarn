const loadLeaderboard = async (sprintId: string) => {
  if (leaderboards[sprintId]) return;
  setLoadingLeaderboard(sprintId);

  const { data: entries } = await supabase
    .from('sprint_entries')
    .select('user_id, score, time_spent_ms')
    .eq('sprint_id', sprintId)
    .order('score', { ascending: false })
    .order('time_spent_ms', { ascending: true });

  const entrantCount = entries?.length ?? 0;
  setStats(prev => ({ ...prev, [sprintId]: { entrant_count: entrantCount } }));

  if (!entries || entries.length === 0) {
    setLeaderboards(prev => ({ ...prev, [sprintId]: [] }));
    setLoadingLeaderboard(null);
    return;
  }

  const userIds = entries.map((e: any) => e.user_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', userIds);

  const nameMap: Record<string, string> = {};
  for (const p of profiles ?? []) {
    nameMap[p.id] = p.display_name ?? 'Reader';
  }

  const ranked = entries.map((row: any, idx: number) => ({
    user_id: row.user_id,
    display_name: nameMap[row.user_id] ?? 'Reader',
    score: row.score ?? 0,
    time_spent_ms: row.time_spent_ms ?? 0,
    rank: idx + 1,
  }));

  setLeaderboards(prev => ({ ...prev, [sprintId]: ranked }));
  setLoadingLeaderboard(null);
};