import { supabase } from "@/integrations/supabase/client";

export const requestWithdrawal = async (
  userId: string,
  amount: number,
  pointsUsed: number,
  payoutMethod: string,
  payoutDetails: Record<string, string>
) => {
  try {
    // Create withdrawal request
    const { error: insertError } = await supabase.from("withdrawal_requests").insert([{
      user_id: userId,
      amount: amount,
      points_used: pointsUsed,
      payout_method: payoutMethod,
      payout_details: payoutDetails as any,
      status: "pending",
    }]);

    if (insertError) throw insertError;

    // Deduct points from user balance (set to zero)
    const { error: updateError } = await supabase
      .from("user_stats")
      .update({ total_points_earned: 0 })
      .eq("user_id", userId);

    if (updateError) throw updateError;
  } catch (error) {
    console.error("Error requesting withdrawal:", error);
    throw error;
  }
};

export const getWithdrawalHistory = async (userId: string) => {
  const { data, error } = await supabase
    .from("withdrawal_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Error fetching withdrawal history:", error);
    return [];
  }

  return data || [];
};
