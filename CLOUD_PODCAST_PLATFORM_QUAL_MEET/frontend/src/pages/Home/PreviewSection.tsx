export default function PreviewSection() {
  return (
    <div className="relative w-full max-w-5xl mx-auto px-6 pb-20 group">
      <div className="absolute -inset-1 bg-linear-to-r from-white/20 to-transparent rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>

      <div className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <img
          src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1600"
          alt="QualMeet Interface"
          className="w-full h-auto opacity-70 group-hover:opacity-90 transition-opacity duration-500"
        />

        <div className="absolute bottom-6 left-6 right-6 p-6 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl flex justify-between items-center">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-gray-800 animate-pulse" />
            <div className="text-left">
              <div className="text-sm font-bold">Strategy Podcast</div>
              <div className="text-xs text-gray-500">
                4 participants live
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-full border-2 border-[#050505] bg-gray-700"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
