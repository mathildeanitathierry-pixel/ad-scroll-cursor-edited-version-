import { supabase } from "@/integrations/supabase/client";

export const getRevolutId = async (userId: string): Promise<string | null> => {
  const { data, error } = await supabase
    .from("user_stats")
    .select("revolut_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching Revolut ID:", error);
    return null;
  }

  return data?.revolut_id || null;
};

export const updateRevolutId = async (userId: string, revolutId: string): Promise<void> => {
  const { error } = await supabase
    .from("user_stats")
    .update({ revolut_id: revolutId })
    .eq("user_id", userId);

  if (error) {
    console.error("Error updating Revolut ID:", error);
    throw error;
  }
};

