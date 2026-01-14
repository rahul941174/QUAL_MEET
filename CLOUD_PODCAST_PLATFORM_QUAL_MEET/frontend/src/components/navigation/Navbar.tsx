import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";
import { Button } from "../ui/Button";
export default function Navbar() {
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated
  );

  return (
    <nav className="relative z-10 flex justify-between items-center max-w-7xl mx-auto px-6 py-8 w-full">
      <Link to="/" className="text-2xl font-bold tracking-tighter italic text-white">
        QUAL<span className="text-gray-500 not-italic">MEET</span>
      </Link>

      {!isAuthenticated ? (
        <div className="flex gap-6 items-center">
          <Link to="/login" className="text-sm text-gray-400 hover:text-white">
            Sign In
          </Link>
          <Link to="/signup">
            <Button variant="primary" className="py-2 px-5 rounded-full">
              Join Now
            </Button>
          </Link>
        </div>
      ) : (
        <div className="flex gap-4 items-center">
          <Link to="/app" className="text-sm text-gray-300 hover:text-white">
            Dashboard
          </Link>
          <Button variant="outline">Logout</Button>
        </div>
      )}
    </nav>
  );
}
