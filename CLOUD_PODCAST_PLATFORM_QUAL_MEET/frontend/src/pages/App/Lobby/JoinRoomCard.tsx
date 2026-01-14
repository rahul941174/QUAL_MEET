import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function JoinRoomCard() {
    const [roomId, setRoomId] = useState("");
    const navigate = useNavigate();

    function handleJoin() {
        if (!roomId.trim())
            return;

        navigate(`/app/room/${roomId}/pre`);
    }

    return (
        <div className="border rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold">Join a Room</h3>
            <p className="text-sm text-gray-500">
                Enter a room ID to join.
            </p>

            <input
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Room ID"
            />

            <button onClick={handleJoin} disabled={!roomId}>
                Join Room
            </button>
        </div>
    );

}