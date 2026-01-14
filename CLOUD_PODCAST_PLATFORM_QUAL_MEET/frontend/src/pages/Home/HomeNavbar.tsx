import { Link } from "react-router-dom";

export default function HomeNavbar() {
  return (
    <nav className="relative z-10 flex justify-between items-center max-w-7xl mx-auto px-6 py-8">
      <div className="text-2xl font-bold tracking-tighter italic">
        QUAL<span className="text-gray-500 not-italic">MEET</span>
      </div>

      <div className="flex gap-8 items-center">
        <Link
          to="/login"
          className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
        >
          Sign In
        </Link>

        <Link
          to="/signup"
          className="px-5 py-2 bg-white text-black text-sm font-bold rounded-full hover:bg-gray-200 transition-all active:scale-95"
        >
          Join Now
        </Link>
      </div>
    </nav>
  );
}
