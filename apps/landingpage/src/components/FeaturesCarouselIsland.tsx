import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Feature {
  id: string;
  title: string;
  description: string;
  image: string;
  imageWebp: string;
  badge?: string;
}

interface FeaturesCarouselProps {
  features: Feature[];
  intervalMs?: number;
}

const mod = (n: number, m: number) => ((n % m) + m) % m;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reduced;
}

export function FeaturesCarouselIsland({
  features,
  intervalMs = 5000,
}: FeaturesCarouselProps) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [tops, setTops] = useState<number[]>([]);
  const [heights, setHeights] = useState<number[]>([]);
  const prefersReducedMotion = usePrefersReducedMotion();

  const measure = useCallback(() => {
    const listEl = listRef.current;
    if (!listEl) return;
    const listRect = listEl.getBoundingClientRect();
    const newTops: number[] = [];
    const newHeights: number[] = [];

    itemRefs.current.forEach((el) => {
      if (el) {
        const rect = el.getBoundingClientRect();
        newTops.push(rect.top - listRect.top);
        newHeights.push(rect.height);
      } else {
        newTops.push(0);
        newHeights.push(0);
      }
    });

    setTops(newTops);
    setHeights(newHeights);
  }, []);

  useLayoutEffect(() => {
    measure();
    const id = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(id);
  }, [active, measure]);

  useEffect(() => {
    const ro = new ResizeObserver(measure);
    const currentRef = listRef.current;

    if (currentRef) ro.observe(currentRef);
    window.addEventListener("resize", measure);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  useEffect(() => {
    if (prefersReducedMotion || paused) return;

    const id = setTimeout(
      () => setActive((prev) => (prev + 1) % features.length),
      intervalMs,
    );
    return () => clearTimeout(id);
  }, [active, intervalMs, features.length, prefersReducedMotion, paused]);

  const selectFeature = (index: number) => {
    setActive(index);
    itemRefs.current[index]?.focus();
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setActive((prev) => (prev + 1) % features.length);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setActive((prev) => mod(prev - 1, features.length));
      }
      if (e.key === "Home") {
        e.preventDefault();
        setActive(0);
      }
      if (e.key === "End") {
        e.preventDefault();
        setActive(features.length - 1);
      }
    },
    [features.length],
  );

  const trackTop = tops[active] ?? 0;
  const trackHeight = heights[active] ?? 48;
  const trackMoveDuration = 0.05;

  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setPaused(false);
        }
      }}
    >
      <div className="flex flex-col gap-12 lg:gap-18">
        <div
          className="relative flex gap-4 lg:gap-8 pl-[.1875rem] order-3 lg:order-2"
          role="tablist"
          aria-label="Features"
          onKeyDown={handleKeyDown}
        >
          <div className="relative min-w-[.1875rem] bg-surface-container-high rounded-sm overflow-hidden" aria-hidden="true">
            <motion.div
              className="absolute left-0 w-full"
              animate={{ top: trackTop, height: trackHeight }}
              transition={{
                top: { duration: trackMoveDuration, ease: "easeOut" },
                height: { duration: trackMoveDuration, ease: "easeOut" },
              }}
            >
              <motion.div
                key={active}
                className="absolute inset-0 w-full h-full bg-primary-500 origin-top rounded-sm pointer-events-none"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: prefersReducedMotion ? 1 : 1 }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : {
                        delay: trackMoveDuration,
                        duration: Math.max(0, intervalMs / 1000 - trackMoveDuration),
                        ease: "linear",
                      }
                }
              />
            </motion.div>
          </div>

          <div ref={listRef} className="flex flex-col gap-4">
            {features.map((feature, i) => (
              <button
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                key={feature.id}
                type="button"
                role="tab"
                id={`feature-tab-${feature.id}`}
                aria-selected={i === active}
                aria-controls={`feature-panel-${feature.id}`}
                tabIndex={i === active ? 0 : -1}
                className={`flex flex-col items-start gap-4 relative cursor-pointer transition-opacity duration-200 py-2 text-left bg-transparent border-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-sm ${
                  i === active ? "opacity-100" : "opacity-50 hover:opacity-75"
                }`}
                onClick={() => selectFeature(i)}
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-2">
                  {feature.badge && (
                    <span className="bg-success-50 text-success-800 border-success-600/30 px-2 py-1 border rounded-sm font-mono text-xs max-w-fit leading-3 uppercase tracking-wider">
                      {feature.badge}
                    </span>
                  )}
                  <h3 className="text-2xl lg:text-lg xl:text-2xl leading-7.5 font-semibold text-on-surface font-display">
                    {feature.title}
                  </h3>
                </div>

                {i === active && (
                  <motion.p
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.25, ease: "easeOut" }}
                    className="text-base font-medium text-on-surface-variant lg:max-w-lg"
                  >
                    {feature.description}
                  </motion.p>
                )}
              </button>
            ))}
          </div>
        </div>

        <div
          id={`feature-panel-${features[active].id}`}
          role="tabpanel"
          aria-labelledby={`feature-tab-${features[active].id}`}
          className="flex lg:hidden items-center justify-center bg-surface-container border border-outline rounded-xl order-2 lg:order-3 p-4"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, x: prefersReducedMotion ? 0 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: prefersReducedMotion ? 0 : -20 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
              className="w-full inset-0 flex items-center justify-center p-4 sm:p-10"
            >
              <picture>
                <source srcSet={features[active].imageWebp} type="image/webp" />
                <img
                  src={features[active].image}
                  alt={features[active].title}
                  className="w-auto h-auto"
                  loading="lazy"
                />
              </picture>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div
        role="tabpanel"
        aria-labelledby={`feature-tab-${features[active].id}`}
        className="relative hidden lg:flex items-center h-140 justify-center bg-surface-container border border-outline rounded-xl"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, x: prefersReducedMotion ? 0 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: prefersReducedMotion ? 0 : -20 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
            className="w-full h-140 absolute inset-0 flex items-center justify-center p-10"
          >
            <picture>
              <source srcSet={features[active].imageWebp} type="image/webp" />
              <img
                src={features[active].image}
                alt={features[active].title}
                className="w-auto object-contain"
                loading="lazy"
              />
            </picture>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
