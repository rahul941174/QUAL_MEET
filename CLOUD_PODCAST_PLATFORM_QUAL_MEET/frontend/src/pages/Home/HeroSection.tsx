import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";
import { Button } from "../../components/ui/Button";

export default function HeroSection() {
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated
  );

  return (
    <section className="flex flex-col items-center text-center pt-24 px-6">
      <h1 className="text-7xl font-black tracking-tighter mb-6">
        QualMeet
      </h1>

      <p className="max-w-2xl text-lg text-gray-400 mb-10">
        High-fidelity cloud meetings & professional podcasting.
      </p>

      {!isAuthenticated ? (
        <div className="flex gap-4">
          <Link to="/login">
            <Button variant="primary">Start a Meeting</Button>
          </Link>
          <Link to="/signup">
            <Button variant="outline">Create Free Account</Button>
          </Link>
        </div>
      ) : (
        <Link to="/app">
          <Button variant="primary">Go to Dashboard</Button>
        </Link>
      )}
    </section>
  );
}
