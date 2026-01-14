import {useState} from "react";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../store";
import { loginAndIntializeApp } from "../controllers/authController";
import {  useNavigate } from "react-router-dom";

export default function LoginForm(){
    const dispatch = useDispatch<AppDispatch>();
    const navigate=useNavigate();

    const [email,setEmail]=useState("");
    const [password,setPassword]=useState("");
    const [loading,setLoading]=useState(false);

    async function handleLogin(){
        setLoading(true);
        const success=await loginAndIntializeApp(dispatch,email,password);
        setLoading(false);

        if(success){
            navigate("/app");
        }
    }


    const inputStyle = `
        w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 
        text-white placeholder:text-gray-600 outline-none transition-all
        focus:bg-white/[0.08] focus:border-white/30 focus:ring-1 focus:ring-white/20
    `;

    return (
        <div className="space-y-6">
        <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white tracking-tight text-center">Welcome Back</h2>
            <p className="text-gray-500 text-center text-sm">Please enter your details to continue</p>
        </div>

        <div className="space-y-4">
            {/* Email Input */}
            <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
            <input
                type="email"
                placeholder="name@company.com"
                className={inputStyle}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
            <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Password</label>
                <a href="#" className="text-[10px] text-gray-500 hover:text-white uppercase font-bold tracking-tighter">Forgot?</a>
            </div>
            <input
                type="password"
                placeholder="••••••••"
                className={inputStyle}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
            </div>
        </div>

        {/* Login Button */}
        <button
            onClick={handleLogin}
            disabled={loading}
            className={`
            w-full py-4 rounded-xl font-bold text-sm transition-all active:scale-[0.98]
            ${loading 
                ? "bg-gray-800 text-gray-500 cursor-not-allowed" 
                : "bg-white text-black hover:bg-gray-200 shadow-[0_0_20px_rgba(255,255,255,0.1)]"}
            `}
        >
            {loading ? (
            <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                Verifying...
            </div>
            ) : (
            "Login to Dashboard"
            )}
        </button>
        </div>
    );
}