import { useSelector } from "react-redux";
import type { RootState } from "frontend/src/store";
import AppLayout from "./AppLayout";
import { Navigate } from "react-router-dom";
import { Outlet } from "react-router-dom";

export default function AppPage(){
    
    const isAuthenticated=useSelector((state:RootState)=>state.auth.isAuthenticated);

    if (!isAuthenticated) {
        return <Navigate to="/login" replace/>;
    }

    return (
        <AppLayout>
            <Outlet />
        </AppLayout>
    );
}