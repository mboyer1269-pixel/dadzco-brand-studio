import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center space-y-6">
        <h1 className="font-display text-6xl font-light text-foreground tracking-wide">
          404
        </h1>
        <p className="text-sm text-muted-foreground font-body tracking-wide">
          Cette page n'existe pas.
        </p>
        <Link
          to="/"
          className="inline-block text-xs font-body tracking-[0.15em] uppercase text-foreground border border-border rounded px-6 py-2.5 hover:bg-muted/50 transition-colors duration-200"
        >
          Retour au QG
        </Link>
        <div className="pt-12">
          <p className="text-[10px] tracking-widest uppercase text-muted-foreground font-body">
            DADZCO · Brand OS
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
