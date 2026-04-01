import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6">
      <div className="text-center">
        <div className="mb-4 text-6xl" aria-hidden="true">🗺️</div>
        <h1 className="text-3xl font-bold text-ink">Page not found</h1>
        <p className="mt-2 text-muted">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/login" className="mt-6 inline-block">
          <Button>Back to login</Button>
        </Link>
      </div>
    </div>
  );
}
