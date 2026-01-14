import { useDispatch } from "react-redux";
import { clearUser } from "../../store/authSlice";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();

  function handleLogout() {
    dispatch(clearUser());
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="p-4 border-b">
        <div className="flex justify-between items-center">
          <h1 className="font-bold">QualMeet App</h1>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
}
