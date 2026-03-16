import { Link } from "wouter";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4 pb-20">
      <div className="text-center bg-card p-8 rounded-3xl shadow-xl max-w-md w-full border border-border">
        <AlertCircle className="w-20 h-20 text-destructive mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-foreground mb-4">Page Not Found</h1>
        <p className="text-lg text-muted-foreground mb-8">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <Link href="/">
          <Button size="lg" className="w-full">
            Return Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
