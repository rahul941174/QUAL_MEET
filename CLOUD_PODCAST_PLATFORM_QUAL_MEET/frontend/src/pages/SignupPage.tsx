import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import type { RootState } from "../store";
import SignupForm from "../components/SignupForm";

export default function SignupPage() {
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated
  );

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Ambient background glow */}
      <div className="absolute top-[-20%] right-[-10%] w-150 h-150 bg-white/3 rounded-full blur-[150px]" />
      
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-black tracking-tighter text-white hover:opacity-80 transition-opacity">
            QUAL<span className="text-gray-500">MEET</span>
          </Link>
          <p className="text-gray-500 text-sm mt-2 font-medium tracking-wide uppercase">Create your professional account</p>
        </div>

        <div className="bg-[#0a0a0a] border border-white/10 p-8 md:p-10 rounded-3xl shadow-2xl backdrop-blur-xl relative">
          <SignupForm />
        </div>

        <p className="text-center text-gray-500 mt-8 text-sm">
          Already using QualMeet?{" "}
          <Link to="/login" className="text-white font-semibold hover:underline">
            Log in here
          </Link>
        </p>
      </div>
    </div>
  );
}
