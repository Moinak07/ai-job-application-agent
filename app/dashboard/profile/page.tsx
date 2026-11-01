import { createClient } from "@/lib/supabase/server";
import { emptyProfile, normalizeProfile } from "@/lib/profile";
import { ProfileView } from "@/components/dashboard/profile/profile-view";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // The dashboard layout redirects unauthenticated users; this keeps the
  // page safe even if it is ever rendered outside that layout.
  if (authError || !user) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-zinc-100">Profile</h2>
        <p className="text-zinc-400">
          Please sign in again to view your profile.
        </p>
      </div>
    );
  }

  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  // A missing row is fine (saving upserts it); a failed select usually
  // means the schema has not been migrated yet.
  const profile = profileRow ? normalizeProfile(profileRow) : emptyProfile();

  return (
    <ProfileView
      profile={profile}
      loadError={
        profileError
          ? "Your profile could not be loaded. The database may be missing the latest schema — run the SQL from supabase/schema.sql in Supabase, then reload this page."
          : undefined
      }
    />
  );
}
