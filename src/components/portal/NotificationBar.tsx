import { useState, useEffect } from "react";
import { X, Megaphone } from "lucide-react";
import DOMPurify from "dompurify";
import { getNotificationSettings } from "@/services/portalApi";

export function NotificationBar() {
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState("");
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [linkText, setLinkText] = useState<string | null>(null);
  const [version, setVersion] = useState(1);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    async function init() {
      const res = await getNotificationSettings();
      if (res.success && res.data.notification_enabled && res.data.notification_message) {
        const currentVersion = res.data.notification_version || 1;
        const dismissalKey = `unb_notification_dismissed_v${currentVersion}`;
        
        if (localStorage.getItem(dismissalKey) !== "true") {
          setMessage(res.data.notification_message);
          setLinkUrl(res.data.notification_link_url);
          setLinkText(res.data.notification_link_text);
          setVersion(currentVersion);
          setShow(true);
        }
      }
      setLoading(false);
    }
    void init();
  }, []);

  const handleDismiss = () => {
    setIsClosing(true);
    setTimeout(() => {
      localStorage.setItem(`unb_notification_dismissed_v${version}`, "true");
      setShow(false);
    }, 300); // match transition duration
  };

  if (loading || !show) return null;

  return (
    <div 
      className={`bg-accent transition-all duration-300 ease-in-out overflow-hidden shadow-sm ${
        isClosing ? "max-h-0 opacity-0" : "max-h-[500px] opacity-100"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 py-2 sm:py-3 sm:px-6 lg:px-8 relative">
        <div className="flex items-center gap-3 sm:gap-6 pr-8 sm:pr-10">
          <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
            <Megaphone className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 mt-0.5 text-[#1F1206]" />
            <div className="flex-1 min-w-0">
              <div 
                className="urdu prose prose-sm [&_p]:!m-0 max-w-none text-[#1F1206] prose-a:text-[#1F1206] prose-a:underline hover:prose-a:text-[#1F1206]/80 prose-strong:text-[#1F1206] leading-tight sm:leading-snug text-xs sm:text-sm"
                dir="auto"
                dangerouslySetInnerHTML={{ 
                  __html: DOMPurify.sanitize(message, { ADD_ATTR: ['target', 'style', 'data-align', 'dir'] }) 
                }}
              />
            </div>
          </div>
          
          {linkUrl && linkText && (
            <div className="shrink-0">
              <a 
                href={linkUrl}
                target={linkUrl.startsWith("/") ? "_self" : "_blank"}
                rel={linkUrl.startsWith("/") ? "" : "noopener noreferrer"}
                className="inline-flex items-center rounded-full bg-[#FFFCF5] px-3 py-1 sm:px-4 sm:py-1.5 text-xs sm:text-sm font-semibold text-[#9F5405] hover:bg-[#FFFCF5]/90 shadow-sm transition-colors whitespace-nowrap"
              >
                {linkText}
              </a>
            </div>
          )}
        </div>

        <button
          onClick={handleDismiss}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 rounded-md p-1 sm:p-1.5 hover:bg-[#1F1206]/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[#1F1206]/20 text-[#1F1206]"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
      </div>
    </div>
  );
}
