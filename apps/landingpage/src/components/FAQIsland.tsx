import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQProps {
  items: FAQItem[];
}

export function FAQIsland({ items }: FAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="max-w-3xl mx-auto">
      {items.map((item, index) => {
        const panelId = `faq-panel-${index}`;
        const isOpen = openIndex === index;

        return (
          <div key={index} className="border-b border-outline-variant last:border-b-0">
            <button
              id={`faq-trigger-${index}`}
              onClick={() => toggleItem(index)}
              className="w-full py-6 flex items-center justify-between text-left gap-4 group cursor-pointer bg-transparent border-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-sm"
              aria-expanded={isOpen}
              aria-controls={panelId}
            >
              <h3 className="text-lg md:text-xl font-medium text-on-surface font-display group-hover:text-primary-300 transition-colors">
                {item.question}
              </h3>
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="flex-shrink-0"
                aria-hidden="true"
              >
                <ChevronDown
                  size={24}
                  className="text-on-surface-variant group-hover:text-primary-300 transition-colors"
                />
              </motion.div>
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  id={panelId}
                  role="region"
                  aria-labelledby={`faq-trigger-${index}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <p className="pb-6 text-on-surface-variant text-base md:text-lg leading-relaxed">
                    {item.answer}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
