import { useState, useEffect } from "react";
import { Instagram } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export function FloatingHelpWidget() {
  const { settings } = useSiteSettings();
  const [showInsta, setShowInsta] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowInsta(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!settings.show_floating_widget) {
    return null;
  }

  const instagramHref = settings.instagram_url || "https://www.instagram.com/urdunovelbank";

  return (
    <div
      className={`fixed bottom-6 left-6 z-50 flex flex-col items-center justify-center gap-2 transition-all duration-300 ease-in-out ${
        showInsta ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-10 opacity-0"
      }`}
    >
      <span className="bg-white/90 backdrop-blur-sm px-2 py-1 text-[11px] leading-none font-medium whitespace-nowrap text-stone-600 shadow-md rounded-full border border-stone-200">
        Need help?
      </span>
      <a
        href={instagramHref}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 shadow-lg transition-all hover:scale-110 hover:shadow-xl"
        aria-label="Contact us on Instagram"
      >
        <Instagram className="h-6 w-6 text-white" />
      </a>
    </div>
  );
}
