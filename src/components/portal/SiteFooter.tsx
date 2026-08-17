import { Link } from "react-router-dom";
import { site } from "@/data/content";
import { FaWhatsapp, FaYoutube, FaInstagram, FaFacebookF, FaPinterestP, FaTelegram } from "react-icons/fa6";

const socialLinks = [
  { icon: FaFacebookF, url: "https://www.facebook.com/people/Urdu-novel-Bank/100090906471153/", label: "Follow us on Facebook" },
  { icon: FaWhatsapp, url: "https://whatsapp.com/channel/0029VaurdEY0wajrnyeAl50Y", label: "Follow us on WhatsApp" },
  { icon: FaPinterestP, url: "https://www.pinterest.com/urdunovelbanks/", label: "Follow us on Pinterest" },
  { icon: FaInstagram, url: "https://www.instagram.com/urdunovelbank/", label: "Follow us on Instagram" },
  { icon: FaYoutube, url: "https://youtube.com/@urdunovelbank", label: "Follow us on YouTube" },
  { icon: FaTelegram, url: "https://t.me/urdunovelbank", label: "Follow us on Telegram" },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-secondary bg-secondary text-secondary-foreground">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <h3 className="font-display text-lg font-semibold">{site.name}</h3>
          <p className="urdu mt-2 max-w-sm text-sm opacity-80">{site.taglineUrdu}</p>
          <p className="mt-3 max-w-sm text-sm opacity-80">{site.tagline}</p>
        </div>
        <div>
          <p className="text-sm font-semibold">For Writers</p>
          <ul className="mt-3 space-y-2 text-sm opacity-80">
            <li>
              <Link to="/process" className="hover:text-primary-glow transition-colors">
                Publication Process
              </Link>
            </li>
            <li>
              <Link to="/guidelines" className="hover:text-primary-glow transition-colors">
                Submission Guidelines
              </Link>
            </li>
            <li>
              <Link to="/policy" className="hover:text-primary-glow transition-colors">
                Publication Policy
              </Link>
            </li>
            <li>
              <Link to="/timeline" className="hover:text-primary-glow transition-colors">
                Publication Timeline
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Portal</p>
          <ul className="mt-3 space-y-2 text-sm opacity-80">
            <li>
              <Link to="/submit" className="hover:text-primary-glow transition-colors">
                Submit Your Novel
              </Link>
            </li>
            <li>
              <Link to="/track" className="hover:text-primary-glow transition-colors">
                Track Submission
              </Link>
            </li>
            <li>
              <Link to="/faq" className="hover:text-primary-glow transition-colors">
                FAQs
              </Link>
            </li>
            <li>
              <a href={site.mainSite} className="hover:text-primary-glow transition-colors">
                Main Website
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-4 px-5 pb-10 sm:justify-start">
        {socialLinks.map((social, index) => {
          const Icon = social.icon;
          return (
            <a
              key={index}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={social.label}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-background text-secondary transition-colors hover:bg-primary-glow hover:text-primary-foreground"
            >
              <Icon className="h-5 w-5" />
            </a>
          );
        })}
      </div>
      <div className="border-t border-secondary-foreground/20">
        <div className="mx-auto max-w-6xl px-5 py-5 text-xs opacity-70">
          © {new Date().getFullYear()} {site.name}. Writer &amp; Publication Portal.
        </div>
      </div>
    </footer>
  );
}