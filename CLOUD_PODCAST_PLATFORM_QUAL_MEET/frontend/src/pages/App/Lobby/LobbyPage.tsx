import CreateRoomCard from "./CreateRoomCard";
import JoinRoomCard from "./JoinRoomCard";

export default function Lobbypage(){
    return(
        <div className="max-w-5xl mx-auto space-y-8">
            <h2 className="text-2xl font-bold">Welcome to QualMeet</h2>
            <p className="text-gray-500">
                Create a new meeting or join an existing one.
            </p>

            <div className="grid md:grid-cols-2 gap-6">
                <CreateRoomCard />
                <JoinRoomCard />
            </div>
        </div>
    );
}