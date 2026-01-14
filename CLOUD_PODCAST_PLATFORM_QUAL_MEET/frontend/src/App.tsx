import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/Home/HomePage";
import SignupPage from "./pages/SignupPage";
import LoginPage from "./pages/LoginPage";
import AppPage from "./pages/App/AppPage";
import RoomPage from "./pages/App/Room/RoomPage";
import { PreJoinPage } from "./pages/App/PreJoin";
import LobbyPage from "./pages/App/Lobby/LobbyPage";

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />

                <Route path="/app" element={<AppPage />}>
                    <Route index element={<LobbyPage />} />
                    <Route path="room/:roomId" element={<RoomPage />} />
                    <Route path="room/:roomId/pre" element={<PreJoinPage />} />
                </Route>


            </Routes>
        </BrowserRouter>
    )
}