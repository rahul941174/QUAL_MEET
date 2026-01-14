import {useState} from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "../store";
import { signupUser } from "../controllers/authController";
import { RootState } from "../store";
import { useNavigate } from "react-router-dom";



export default function SignupForm(){

    const dispatch = useDispatch<AppDispatch>();
    const navigate=useNavigate();

    const [email,setEmail]=useState("");
    const [password,setPassword]=useState("");
    const [fullName,setFullName]=useState("");
    const [loading,setLoading]=useState(false);

    const banner=useSelector((state:RootState)=>state.ui.banner);

    async function handleSubmit(e:React.FormEvent){
        e.preventDefault();

        setLoading(true);

        const success=await signupUser(dispatch,email,password,fullName);

        setLoading(false);

        if(success){
            navigate("/login");
        }
    }

    const inputStyle = `
        w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 
        text-white placeholder:text-gray-600 outline-none transition-all
        focus:bg-white/[0.08] focus:border-white/30 focus:ring-1 focus:ring-white/20
    `;

    return (
        <div className="space-y-6">
        <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white tracking-tight text-center">Get Started</h2>
        </div>

        {/* Redux Banner Message */}
        {banner && (
            <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-xs text-center text-gray-300 animate-pulse">
            {banner}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-1">Full Name</label>
            <input
                type="text"
                placeholder="John Doe"
                className={inputStyle}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
            />
            </div>

            <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-1">Email Address</label>
            <input
                type="email"
                placeholder="john@example.com"
                className={inputStyle}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
            />
            </div>

            <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-1">Password</label>
            <input
                type="password"
                placeholder="Create a strong password"
                className={inputStyle}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
            />
            </div>

            <button
            type="submit"
            disabled={loading}
            className={`
                w-full mt-4 py-4 rounded-xl font-bold text-sm transition-all active:scale-[0.98]
                ${loading 
                ? "bg-gray-800 text-gray-500 cursor-not-allowed" 
                : "bg-white text-black hover:bg-gray-200 shadow-[0_10px_30px_rgba(255,255,255,0.1)]"}
            `}
            >
            {loading ? (
                <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                Creating Account...
                </div>
            ) : (
                "Create Account"
            )}
            </button>
        </form>

        <div className="pt-2 text-center">
            <p className="text-[11px] text-gray-600 leading-relaxed px-4">
            By joining, you agree to QualMeet's <br/>
            <span className="underline cursor-pointer">Terms of Service</span> and <span className="underline cursor-pointer">Privacy Policy</span>.
            </p>
        </div>
        </div>
    );
}