import { useLanguage } from "@/contexts/LanguageContext";
import { BusFront, Languages } from "lucide-react";
import { Link } from "wouter";

export function Header() {
  const { lang, toggleLang, t } = useLanguage();

  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border shadow-sm">
      <div className="container flex h-20 items-center justify-between px-4 max-w-2xl mx-auto">
        <Link href="/">
          <div className="flex items-center gap-3 active:scale-95 transition-transform cursor-pointer">
            <div className="bg-primary text-primary-foreground p-2.5 rounded-xl shadow-lg shadow-primary/20">
              <BusFront className="w-8 h-8" />
            </div>
            <div className="flex flex-col">
              <h1 className="font-display font-bold text-xl leading-tight text-foreground">
                {t("app.title")}
              </h1>
              <span className="text-xs text-muted-foreground font-medium">{t("app.subtitle")}</span>
            </div>
          </div>
        </Link>
        <button
          onClick={toggleLang}
          className="flex items-center justify-center gap-2 h-12 px-4 rounded-xl bg-secondary/10 text-secondary-foreground font-bold hover:bg-secondary/20 active:scale-95 transition-all text-sm"
        >
          <Languages className="w-5 h-5 text-secondary" />
          <span className="text-secondary">{lang === "en" ? "తెలుగు" : "English"}</span>
        </button>
      </div>
    </header>
  );
}
