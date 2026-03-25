import { supabaseAdmin } from './supabase';
import {
  analyzeProfileAi,
  type ProfileAnalysisInput,
  type ProfileAnalysisPost,
} from './ai-profile-analysis';

interface SyncResultItem {
  profileId: string;
  username: string;
  tagCount: number;
  analyzedPostCount: number;
  summary: string;
}

export interface SyncProfileAiResult {
  processedCount: number;
  profiles: SyncResultItem[];
}

interface ProfileRow {
  id: string;
  platform: 'instagram' | 'tiktok' | 'youtube';
  username: string;
  full_name?: string | null;
}

interface PostRow {
  id: string;
  profile_id: string;
  caption?: string | null;
  hashtags?: string[] | null;
  like_count?: number | null;
  comment_count?: number | null;
  video_view_count?: number | null;
  video_play_count?: number | null;
  posted_at?: string | null;
}

export async function syncProfileAiSignals(profileIds?: string[]): Promise<SyncProfileAiResult> {
  let profileQuery = supabaseAdmin
    .from('profiles')
    .select('id, platform, username, full_name')
    .order('created_at', { ascending: false });

  if (profileIds && profileIds.length > 0) {
    profileQuery = profileQuery.in('id', profileIds);
  }

  const { data: profiles, error: profilesError } = await profileQuery;
  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const safeProfiles = (profiles || []) as ProfileRow[];
  if (safeProfiles.length === 0) {
    return { processedCount: 0, profiles: [] };
  }

  const { data: posts, error: postsError } = await supabaseAdmin
    .from('posts')
    .select('id, profile_id, caption, hashtags, like_count, comment_count, video_view_count, video_play_count, posted_at')
    .in('profile_id', safeProfiles.map((profile) => profile.id))
    .order('posted_at', { ascending: false });

  if (postsError) {
    throw new Error(postsError.message);
  }

  const postsByProfile = new Map<string, ProfileAnalysisPost[]>();
  for (const post of (posts || []) as PostRow[]) {
    const current = postsByProfile.get(post.profile_id) || [];
    current.push(post);
    postsByProfile.set(post.profile_id, current);
  }

  const results: SyncResultItem[] = [];

  for (const profile of safeProfiles) {
    const analysis = analyzeProfileAi(
      profile as ProfileAnalysisInput,
      postsByProfile.get(profile.id) || [],
    );

    const { error: deleteTagsError } = await supabaseAdmin
      .from('profile_ai_tags')
      .delete()
      .eq('profile_id', profile.id);

    if (deleteTagsError) {
      throw new Error(deleteTagsError.message);
    }

    if (analysis.tags.length > 0) {
      const { error: insertTagsError } = await supabaseAdmin
        .from('profile_ai_tags')
        .insert(analysis.tags.map((tag) => ({
          profile_id: profile.id,
          tag_id: tag.id,
          confidence: tag.confidence,
          evidence: tag.evidence,
          source_version: analysis.summary.sourceVersion,
          generated_at: analysis.summary.generatedAt,
        })));

      if (insertTagsError) {
        throw new Error(insertTagsError.message);
      }
    }

    const { error: summaryError } = await supabaseAdmin
      .from('profile_ai_summaries')
      .upsert({
        profile_id: profile.id,
        summary: analysis.summary.summary,
        analyzed_post_count: analysis.summary.analyzedPostCount,
        top_keywords: analysis.summary.topKeywords,
        source_version: analysis.summary.sourceVersion,
        generated_at: analysis.summary.generatedAt,
        metadata: analysis.summary.metadata,
      }, { onConflict: 'profile_id' });

    if (summaryError) {
      throw new Error(summaryError.message);
    }

    results.push({
      profileId: profile.id,
      username: profile.username,
      tagCount: analysis.tags.length,
      analyzedPostCount: analysis.summary.analyzedPostCount,
      summary: analysis.summary.summary,
    });
  }

  return {
    processedCount: results.length,
    profiles: results,
  };
}
