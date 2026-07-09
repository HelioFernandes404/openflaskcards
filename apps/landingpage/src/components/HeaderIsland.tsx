import { Menu, X, Globe, ChevronDown } from "lucide-react";
import { useState } from "react";
import type { Lang } from "../i18n/utils";
import { languages, getLocalizedPath } from "../i18n/utils";

interface Props {
  lang: Lang;
  currentPath: string;
  translations: {
    home: string;
    howItWorks: string;
    features: string;
    button: string;
    skipToMain: string;
  };
}

const GITHUB_URL = "https://github.com/HelioFernandes404/openflashcards";

const languageData = [
  { code: "pt" as const, label: "Português", flag: "🇧🇷" },
  { code: "en" as const, label: "English", flag: "🇺🇸" },
  { code: "es" as const, label: "Español", flag: "🇪🇸" },
  { code: "fr" as const, label: "Français", flag: "🇫🇷" },
  { code: "de" as const, label: "Deutsch", flag: "🇩🇪" },
  { code: "it" as const, label: "Italiano", flag: "🇮🇹" },
  { code: "ja" as const, label: "日本語", flag: "🇯🇵" },
  { code: "zh" as const, label: "简体中文", flag: "🇨🇳" },
  { code: "ko" as const, label: "한국어", flag: "🇰🇷" },
];

const ctaClass =
  "hidden sm:flex w-full max-w-fit items-center justify-center text-center text-base font-medium cursor-pointer text-on-primary px-4 py-2 rounded-md bg-primary-500 hover:bg-primary-hover active:bg-primary-active active:scale-[0.98] transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-[3px] focus-visible:ring-offset-neutral-0";

const navButtonClass =
  "cursor-pointer text-on-surface-variant hover:text-on-surface bg-transparent border-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-sm";

export function HeaderIsland({ lang, currentPath, translations }: Props) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);

  const navItems = [
    { id: "home", label: translations.home },
    { id: "how-it-works", label: translations.howItWorks },
    { id: "features", label: translations.features },
  ];

  const homePath = getLocalizedPath(lang, "/");
  const isHomePage =
    currentPath === "/" ||
    currentPath === homePath ||
    currentPath === `${homePath}/`;

  const handleNavClick = (sectionId: string) => {
    if (!isHomePage) {
      window.location.href = `${homePath}#${sectionId}`;
    } else {
      const section = document.getElementById(sectionId);
      if (section) {
        section.scrollIntoView({ behavior: "smooth" });
      }
    }
    setIsMenuOpen(false);
  };

  const handleLanguageChange = (newLang: Lang) => {
    // currentPath comes from Astro.url.pathname and includes the site's
    // base path (e.g. "/openflashcards/pt/"). Strip it before inspecting
    // the locale segment, since getLocalizedPath() re-adds the base below.
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    const pathWithoutBase =
      base && currentPath.startsWith(base)
        ? currentPath.slice(base.length) || "/"
        : currentPath;

    let pathWithoutLang = pathWithoutBase;
    for (const l of Object.keys(languages)) {
      if (pathWithoutBase.startsWith(`/${l}/`)) {
        pathWithoutLang = pathWithoutBase.slice(l.length + 1);
        break;
      } else if (pathWithoutBase === `/${l}`) {
        pathWithoutLang = "/";
        break;
      }
    }

    const newPath = getLocalizedPath(newLang, pathWithoutLang);
    window.location.href = newPath;
    setIsLangOpen(false);
  };

  return (
    <>
      <nav className="hidden md:flex items-center gap-8 md:gap-4 lg:gap-8" aria-label="Main">
        <ul className="flex items-center justify-center gap-8 md:gap-4 lg:gap-8">
          {navItems.map((item) => (
            <li key={item.id} className="text-base font-medium">
              <button
                onClick={() => handleNavClick(item.id)}
                className={navButtonClass}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>

        <div className="relative">
          <button
            onClick={() => setIsLangOpen(!isLangOpen)}
            aria-expanded={isLangOpen}
            aria-haspopup="listbox"
            className="flex items-center gap-2 rounded-md bg-surface-container border border-outline hover:border-outline-strong hover:bg-surface-container-high cursor-pointer px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <Globe size={18} className="text-on-surface-variant" />
            <span className="text-base font-medium text-on-surface-variant uppercase">
              {lang === "pt" ? "PT-BR" : lang.toUpperCase()}
            </span>
            <ChevronDown size={14} className="text-on-surface-variant" />
          </button>

          {isLangOpen && (
            <div
              role="listbox"
              className="flex flex-col gap-1 absolute w-40 rounded-md border border-primary-500 bg-surface-container-high overflow-hidden p-1 z-50"
            >
              {languageData.map((lng) => (
                <button
                  key={lng.code}
                  role="option"
                  aria-selected={lang === lng.code}
                  onClick={() => handleLanguageChange(lng.code)}
                  className={`flex items-center gap-2 px-3 py-2 text-base font-medium text-on-surface w-full text-left hover:bg-surface-container-highest cursor-pointer rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                    lang === lng.code ? "bg-surface-container" : ""
                  }`}
                >
                  <span>{lng.flag}</span>
                  <span>{lng.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={ctaClass}
        >
          {translations.button}
        </a>
      </nav>

      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        aria-expanded={isMenuOpen}
        aria-label={isMenuOpen ? "Close menu" : "Open menu"}
        className="md:hidden flex items-center justify-end p-0 bg-transparent rounded-md border-0 text-on-surface cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        {isMenuOpen ? <X size={32} /> : <Menu size={32} />}
      </button>

      {isMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-neutral-0/80"
            onClick={() => setIsMenuOpen(false)}
            aria-hidden="true"
          />

          <div className="relative bg-surface-container-low border-b border-outline w-full h-auto flex flex-col">
            <div className="container relative flex-1 flex flex-col pt-24 pb-12">
              <nav className="flex flex-col gap-8" aria-label="Mobile">
                <ul className="flex flex-col gap-5">
                  {navItems.map((item) => (
                    <li key={item.id}>
                      <button
                        onClick={() => handleNavClick(item.id)}
                        className={`max-w-fit text-base font-medium block py-3 ${navButtonClass}`}
                      >
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>

                <div className="relative">
                  <button
                    onClick={() => setIsLangOpen(!isLangOpen)}
                    aria-expanded={isLangOpen}
                    className="flex items-center gap-2 rounded-md bg-surface-container border border-outline hover:border-outline-strong hover:bg-surface-container-high cursor-pointer px-3 py-2"
                  >
                    <Globe size={18} className="text-on-surface-variant" />
                    <span className="text-base font-medium text-on-surface-variant uppercase">
                      {lang === "pt" ? "PT-BR" : lang.toUpperCase()}
                    </span>
                    <ChevronDown size={14} className="text-on-surface-variant" />
                  </button>

                  {isLangOpen && (
                    <div className="flex flex-col gap-1 mt-2 w-40 rounded-md border border-primary-500 bg-surface-container-high overflow-hidden p-1">
                      {languageData.map((lng) => (
                        <button
                          key={lng.code}
                          onClick={() => handleLanguageChange(lng.code)}
                          className={`flex items-center gap-2 px-3 py-2 text-base font-medium text-on-surface w-full text-left hover:bg-surface-container-highest cursor-pointer rounded-sm ${
                            lang === lng.code ? "bg-surface-container" : ""
                          }`}
                        >
                          <span>{lng.flag}</span>
                          <span>{lng.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full max-w-fit flex items-center justify-center text-center text-base font-medium cursor-pointer text-on-primary px-4 py-2 rounded-md bg-primary-500 hover:bg-primary-hover active:bg-primary-active active:scale-[0.98] transition-all duration-150 ease-out"
                >
                  {translations.button}
                </a>
              </nav>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
