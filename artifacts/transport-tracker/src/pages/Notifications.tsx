import { Bell, Info, AlertTriangle, CheckCircle, Navigation } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useGetNotifications } from "@workspace/api-client-react";
import { motion } from "framer-motion";

export default function Notifications() {
  const { t, lang } = useLanguage();
  const { data, isLoading } = useGetNotifications();

  const getIcon = (type: string) => {
    switch (type) {
      case 'delayed': return <AlertTriangle className="w-6 h-6 text-destructive" />;
      case 'arrived': return <CheckCircle className="w-6 h-6 text-secondary" />;
      case 'route_change': return <Navigation className="w-6 h-6 text-accent" />;
      default: return <Info className="w-6 h-6 text-primary" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'delayed': return 'bg-destructive/10 border-destructive/20';
      case 'arrived': return 'bg-secondary/10 border-secondary/20';
      case 'route_change': return 'bg-accent/10 border-accent/20';
      default: return 'bg-primary/5 border-primary/10';
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      <div className="p-6 bg-card border-b border-border shadow-sm">
        <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
          <Bell className="w-8 h-8 text-primary" />
          {t("alerts.title")}
        </h1>
      </div>

      <div className="p-4 space-y-4 max-w-2xl mx-auto w-full">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 bg-muted rounded-2xl animate-pulse" />
          ))
        ) : data?.notifications?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Bell className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-xl font-bold">{t("alerts.empty")}</p>
          </div>
        ) : (
          data?.notifications.map((notif, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              key={notif.id} 
              className={`p-5 rounded-2xl border ${getBgColor(notif.type)} flex gap-4`}
            >
              <div className="mt-1">
                {getIcon(notif.type)}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-lg text-foreground">
                    Bus {notif.busNumber}
                  </h3>
                  <span className="text-xs font-medium text-muted-foreground bg-background px-2 py-1 rounded-md">
                    {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-foreground/90 font-medium text-[1.1rem] leading-snug">
                  {lang === 'te' ? notif.messageTelugu : notif.message}
                </p>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
