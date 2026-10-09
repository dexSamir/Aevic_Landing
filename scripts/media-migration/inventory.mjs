import { targets, originalIds, resolveSource, referenceId, assert } from './core.mjs';
export async function inventory(sql, origin) {
  return sql.begin('isolation level repeatable read read only', async tx => {
    const [safety] = await tx`select current_setting('transaction_read_only') as mode`;
    assert(safety.mode === 'on', 'READ_ONLY_REQUIRED');
    const teams = await tx`select id::text,logo_url,player1_photo_url,player2_photo_url,player3_photo_url,player4_photo_url,player5_photo_url,md5((to_jsonb(t)-array['logo_url','player1_photo_url','player2_photo_url','player3_photo_url','player4_photo_url','player5_photo_url','updated_at'])::text) as protected_hash from public.teams t order by id`;
    const details = await tx`select team_id::text,banner_url from aevic_platform.team_details order by team_id`;
    const objects = await tx`select o.id::text,o.bucket_id as bucket,o.name,b.public,coalesce((o.metadata->>'size')::bigint,0)::text as size from storage.objects o join storage.buckets b on b.id=o.bucket_id order by o.bucket_id,o.name`;
    const media = await tx`select id::text,team_id::text,asset_type,octet_length(bytes) as size from aevic_platform.media order by id`;
    const otherMedia = {};
    for (const [key, query] of Object.entries({
      privateEvidence: "select count(*)::int as count from aevic_platform.media where asset_type='evidence'",
      privateSupportAttachments: 'select count(*)::int as count from aevic_platform.support_attachments',
      normalizedMedia: 'select count(*)::int as count from aevic.media',
      normalizedTeamImages: "select count(*)::int as count from aevic.teams where logo_url is not null or banner_url is not null",
      normalizedProfileAvatars: "select count(*)::int as count from aevic.profiles where avatar_url is not null",
    })) otherMedia[key] = (await tx.unsafe(query))[0].count;
    const references = [];
    for (const [table, rows] of [['public.teams', teams], ['aevic_platform.team_details', details]]) {
      for (const row of rows) for (const column of targets[table].columns) {
        if (!row[column]) continue;
        const r = { table, id: row[targets[table].key], column, kind: column === 'logo_url' ? 'logo' : column === 'banner_url' ? 'banner' : 'avatar', oldUrl: row[column] };
        r.key = referenceId(r); r.source = resolveSource(r.oldUrl, objects, media, origin); r.status = r.source.status;
        references.push(r);
      }
    }
    const issues = [];
    if (!originalIds.every(id => teams.some(t=>t.id===id))) issues.push('ORIGINAL_TEAM_MISSING');
    if (otherMedia.normalizedMedia || otherMedia.normalizedTeamImages || otherMedia.normalizedProfileAvatars) issues.push('NORMALIZED_MEDIA_REQUIRES_SEPARATE_SCOPE');
    return { version: 1, origin, createdAt: new Date().toISOString(), teamIds: teams.map(t=>t.id), protectedTeams: Object.fromEntries(teams.map(t=>[t.id,t.protected_hash])), references, storageObjects: objects, databaseMedia: media, otherMedia, issues, assets: {} };
  });
}
