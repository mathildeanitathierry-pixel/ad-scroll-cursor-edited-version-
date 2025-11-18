import { supabase } from "@/integrations/supabase/client";

export const incrementUserStats = async (userId: string, pointsEarned: number = 1) => {
  try {
    // First, check if stats exist
    const { data: existingStats, error: fetchError } = await supabase
      .from("user_stats")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (existingStats) {
      // Update existing stats
      const { error: updateError } = await supabase
        .from("user_stats")
        .update({
          total_ads_watched: existingStats.total_ads_watched + 1,
          total_points_earned: existingStats.total_points_earned + pointsEarned,
        })
        .eq("user_id", userId);

      if (updateError) throw updateError;
    } else {
      // Create new stats if they don't exist
      const { error: insertError } = await supabase
        .from("user_stats")
        .insert({
          user_id: userId,
          total_ads_watched: 1,
          total_points_earned: pointsEarned,
          total_watch_time_seconds: 0,
        });

      if (insertError) throw insertError;
    }
  } catch (error) {
    console.error("Error updating user stats:", error);
  }
};

export const addWatchHistory = async (
  userId: string,
  adId: string,
  brand: string,
  pointsEarned: number = 1
) => {
  try {
    const { error } = await supabase.from("watch_history").insert({
      user_id: userId,
      ad_id: adId,
      brand: brand,
      watch_duration_seconds: 2,
      points_earned: pointsEarned,
    });

    if (error) throw error;
  } catch (error) {
    console.error("Error adding watch history:", error);
  }
};

export const getUserStats = async (userId: string) => {
  const { data, error } = await supabase
    .from("user_stats")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching user stats:", error);
    return null;
  }

  return data;
};

export const getWatchHistory = async (userId: string, limit: number = 20) => {
  const { data, error } = await supabase
    .from("watch_history")
    .select("*")
    .eq("user_id", userId)
    .order("watched_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching watch history:", error);
    return [];
  }

  return data || [];
};
