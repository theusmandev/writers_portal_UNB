import { Link } from "react-router-dom";
import { FileQuestion, Home, FileText, Search, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-16 text-center">
      {/* Visual illustration / icon */}
      <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-accent/10 text-accent">
        <FileQuestion className="h-12 w-12" />
        <span className="absolute -right-1 -top-1 flex h-4 w-4">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/30 opacity-75"></span>
          <span className="relative inline-flex h-4 w-4 rounded-full bg-primary/20"></span>
        </span>
      </div>

      {/* Styled 404 / Title */}
      <h1 className="font-display text-7xl font-extrabold tracking-tight text-primary sm:text-8xl">
        404
      </h1>
      <h2 className="mt-4 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Page Not Found
      </h2>
      
      {/* Bilingual messages */}
      <div className="mt-4 max-w-md space-y-3">
        <p className="text-base text-muted-foreground">
          The page you are looking for doesn't exist, has been moved, or is temporarily unavailable.
        </p>
        <p className="urdu text-lg leading-relaxed text-primary/80">
          معذرت! یہ صفحہ موجود نہیں ہے یا اسے یہاں سے ہٹا دیا گیا ہے۔
        </p>
      </div>

      {/* Quick recovery options */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link to="/">
          <Button className="w-full gap-2">
            <Home className="h-4 w-4" />
            Back to Home
          </Button>
        </Link>
        <Link to="/submit">
          <Button variant="outline" className="w-full gap-2">
            <FileText className="h-4 w-4" />
            Submit Novel
          </Button>
        </Link>
        <Link to="/track">
          <Button variant="outline" className="w-full gap-2">
            <Search className="h-4 w-4" />
            Track Submission
          </Button>
        </Link>
      </div>

      {/* Helper text / guidelines link */}
      <div className="mt-8 border-t border-border/50 pt-6">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 justify-center">
          <Compass className="h-3.5 w-3.5" />
          Looking for our guidelines? Read the{" "}
          <Link to="/guidelines" className="text-primary font-medium hover:underline">
            Submission Guidelines
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
