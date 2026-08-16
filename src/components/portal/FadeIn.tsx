import React, { useEffect, useRef, useState } from "react";

interface FadeInProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  delayMs?: number; // Delay in milliseconds for stagger
  noVertical?: boolean; // If true, only fades (no Y translation)
  as?: React.ElementType; // The HTML element to render (default 'div')
}

export function FadeIn({
  children,
  delayMs = 0,
  noVertical = false,
  className = "",
  as: Component = "div",
  ...props
}: FadeInProps) {
  const [isVisible, setIsVisible] = useState(false);
  const domRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Respect prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            if (domRef.current) {
              observer.unobserve(domRef.current);
            }
          }
        });
      },
      {
        rootMargin: "0px 0px -50px 0px", // trigger slightly before fully visible
        threshold: 0.1,
      }
    );

    const currentRef = domRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);

  const transitionStyles = {
    opacity: isVisible ? 1 : 0,
    transform: isVisible
      ? "translateY(0)"
      : noVertical
      ? "none"
      : "translateY(20px)",
    transition: `opacity 600ms ease-out ${delayMs}ms, transform 600ms ease-out ${delayMs}ms`,
    willChange: "opacity, transform",
  };

  return (
    <Component
      ref={domRef as any}
      style={{ ...transitionStyles, ...props.style }}
      className={className}
      {...props}
    >
      {children}
    </Component>
  );
}
