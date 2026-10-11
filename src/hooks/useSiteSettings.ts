import { useQuery } from "@tanstack/react-query";
import { getSiteSettings, defaultSiteSettings } from "@/services/portalApi";
import type { SiteSettingsRow } from "@/lib/supabase.types";
import { site } from "@/data/content";

export const SITE_SETTINGS_QUERY_KEY = ["site_settings"];

export function useSiteSettings() {
  const query = useQuery<SiteSettingsRow>({
    queryKey: SITE_SETTINGS_QUERY_KEY,
    queryFn: async () => {
      const res = await getSiteSettings();
      if (!res.success) {
        throw new Error(res.error || "Failed to fetch site settings");
      }
      return res.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes cache
    refetchOnWindowFocus: false,
  });

  // Safe fallback settings object ensuring components never crash
  const settings: SiteSettingsRow = query.data ?? {
    ...defaultSiteSettings,
    support_email: site.email,
    main_website_url: site.mainSite,
  };

  return {
    ...query,
    settings,
  };
}
