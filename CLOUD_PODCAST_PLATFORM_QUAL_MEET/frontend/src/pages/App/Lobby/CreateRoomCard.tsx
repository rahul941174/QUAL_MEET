import { useNavigate } from "react-router-dom";
import { createRoom } from "../../../api/rooms";

export default function CreateRoomCard(){

    const navigate=useNavigate();

    async function handleCreate(){
        try{
            const {roomId}=await createRoom();
            console.log("Room created , roomId : ",roomId);
            navigate(`/app/room/${roomId}`);
        }
        catch(error){
            console.error("Failed to create room",error);
        }
    }

    return (
        <div className="border rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold">Create a Room</h3>
            <p className="text-sm text-gray-500">
                Start a new meeting instantly.
            </p>

            <button onClick={handleCreate}>
                Create Room
            </button>
        </div>
    );
}