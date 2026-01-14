import { Navigate } from "react-router-dom";
import { useSelector} from "react-redux";
import { Link } from "react-router-dom";
import type { RootState } from "../store";
import LoginForm from "../components/LoginForm";

export default function LoginPage(){
    const isAuthenticated=useSelector(
        (state:RootState)=>state.auth.isAuthenticated
    );

    if(isAuthenticated){
        return <Navigate to="/" replace/>;
    }

    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Decorative "Glow" */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-white/[0.03] rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-white/[0.02] rounded-full blur-[100px]" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-black tracking-tighter text-white hover:opacity-80 transition-opacity">
            QUAL<span className="text-gray-500">MEET</span>
          </Link>
          <p className="text-gray-500 text-sm mt-2 font-medium tracking-wide uppercase">Secure Access Portal</p>
        </div>

        {/* The Login Card */}
        <div className="bg-[#0a0a0a] border border-white/10 p-8 md:p-10 rounded-3xl shadow-2xl backdrop-blur-xl">
          <LoginForm />
        </div>

        {/* Footer Link */}
        <p className="text-center text-gray-500 mt-8 text-sm">
          Don't have an account?{" "}
          <Link to="/signup" className="text-white font-semibold hover:underline">
            Sign up for free
          </Link>
        </p>
      </div>
    </div>
    );
}