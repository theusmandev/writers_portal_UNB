import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      // Show button when page is scrolled down 300px
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility, { passive: true });
    // Initial check in case the page is already scrolled on load
    toggleVisibility();

    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? "instant" : "smooth",
    });
  };

  return (
    <Button
      onClick={scrollToTop}
      aria-label="Back to top"
      size="icon"
      className={`fixed bottom-6 right-6 z-40 h-11 w-11 rounded-full shadow-soft transition-all duration-300 sm:bottom-8 sm:right-8 ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0 pointer-events-none"
      } bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95`}
    >
      <ArrowUp className="size-5" />
    </Button>
  );
}
