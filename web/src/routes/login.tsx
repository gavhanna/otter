import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { LoginPage } from "../pages/LoginPage";
import { useAuth } from "../lib/authStore";

export const Route = createFileRoute("/login")({
    component: LoginRoute,
});

function LoginRoute() {
    const { status, user } = useAuth();
    const navigate = Route.useNavigate();

    useEffect(() => {
        if (user && status === "authenticated") {
            void navigate({ to: "/", search: { autoStart: false } });
        }
    }, [user, status, navigate]);

    if (status === "checking") {
        return null;
    }

    return <LoginPage />;
}
