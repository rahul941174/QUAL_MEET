import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getRoom, joinRoom } from "../../../api/rooms";

type PreJoinState = "LOADING" | "READY" | "ERROR";

export default function PreJoinPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const [state, setState] = useState<PreJoinState>("LOADING");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) return;

    let cancelled = false;
    const id = roomId; 

    async function validateRoom() {
      try {
        await getRoom(id);
        if (!cancelled) setState("READY");
      } catch (err: any) {
        if (cancelled) return;
        setError("Meeting not found or inactive.");
        setState("ERROR");
      }
    }

    validateRoom();

    return () => {
      cancelled = true;
    };
  }, [roomId]);

  async function handleJoin() {
    if (!roomId) return;

    try {
      await joinRoom(roomId);
      navigate(`/app/room/${roomId}`, { replace: true });
    } catch (err: any) {
      const msg = err.message ?? "";

      if (msg.includes("ROOM_FULL")) {
        setError("Meeting is full.");
      } else if (msg.includes("ROOM_INACTIVE")) {
        setError("Meeting has ended.");
      } else if (msg.includes("ROOM_NOT_FOUND")) {
        setError("Meeting does not exist.");
      } else {
        // Already joined OR transient issue → allow entry
        navigate(`/app/room/${roomId}`, { replace: true });
        return;
      }

      setState("ERROR");
    }
  }

  if (state === "LOADING") {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Checking meeting…
      </div>
    );
  }

  if (state === "ERROR") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-red-400">{error}</p>
        <button
          onClick={() => navigate("/app")}
          className="px-4 py-2 rounded bg-gray-800 text-white"
        >
          Back to Lobby
        </button>
      </div>
    );
  }

  // READY
  return (
    <div className="max-w-md mx-auto space-y-6">
      <h2 className="text-xl font-bold">Ready to join?</h2>

      {/* Later: camera/mic preview goes here */}

      <button
        onClick={handleJoin}
        className="w-full py-3 rounded bg-white text-black font-semibold"
      >
        Join Meeting
      </button>
    </div>
  );
}
