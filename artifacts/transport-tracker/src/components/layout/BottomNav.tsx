import { Link, useLocation } from "wouter";
import { Home, Map, Bell } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const [location] = useLocation();
  const { t } = useLanguage();

  const navItems = [
    { href: "/", icon: Home, label: t("nav.home") },
    { href: "/track", icon: Map, label: t("nav.track") },
    { href: "/notifications", icon: Bell, label: t("nav.alerts") },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-lg border-t border-border pb-safe">
      <div className="flex justify-around items-center h-20 px-2 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex flex-col items-center justify-center w-24 h-full gap-1 rounded-2xl transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-primary/80"
                )}
              >
                <div className={cn(
                  "p-2 rounded-xl transition-all duration-300",
                  isActive ? "bg-primary/10" : "bg-transparent"
                )}>
                  <Icon className="w-7 h-7" strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className="text-xs font-semibold">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
