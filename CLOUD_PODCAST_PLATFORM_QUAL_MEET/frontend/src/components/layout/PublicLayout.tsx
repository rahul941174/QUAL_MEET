import Navbar from "../navigation/Navbar";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-250 h-150 bg-gradient-radial from-white/[0.07] to-transparent pointer-events-none" />

      <Navbar />

      <main>{children}</main>

      <footer className="py-16 text-center border-t border-white/5 text-sm text-gray-600">
        &copy; 2025 QualMeet Cloud Systems.
      </footer>
    </div>
  );
}
