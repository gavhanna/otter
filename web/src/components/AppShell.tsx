import {
    type ReactNode,
    createContext,
    useCallback,
    useContext,
    useState,
} from "react";
import { useMatch } from "@tanstack/react-router";
import { useAuth } from "../lib/authStore";
import { Sidebar } from "./Sidebar";

type MobileSidebarContextType = {
    openSidebar: () => void;
    closeSidebar: () => void;
};

const MobileSidebarContext = createContext<
    MobileSidebarContextType | undefined
>(undefined);

export function useMobileSidebar(): MobileSidebarContextType {
    const context = useContext(MobileSidebarContext);
    if (!context) {
        throw new Error("useMobileSidebar must be used within AppShell");
    }
    return context;
}

type AppShellProps = {
    children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
    const { user, logout } = useAuth();
    const [isSidebarOpenMobile, setSidebarOpenMobile] = useState(true);
    const recordingMatch = useMatch({
        from: "/_app/recording/$recordingId",
        shouldThrow: false,
    });

    const openSidebar = useCallback(() => setSidebarOpenMobile(true), []);
    const closeSidebar = useCallback(() => setSidebarOpenMobile(false), []);

    const selectedRecordingId =
        recordingMatch?.params?.recordingId ?? null;

    return (
        <MobileSidebarContext.Provider value={{ openSidebar, closeSidebar }}>
            <div className="grid grid-cols-[1fr] md:grid-cols-[auto_1fr]  min-h-screen bg-slate-950 text-slate-100">
                <div
                    className={`${
                        isSidebarOpenMobile ? "w-full" : "hidden"
                    } md:block md:w-80 md:flex-shrink-0`}
                >
                    <Sidebar
                        selectedRecordingId={selectedRecordingId}
                        onCloseMobile={closeSidebar}
                    />
                </div>

                <div
                    className={`flex flex-1 flex-col ${isSidebarOpenMobile ? "hidden md:flex" : ""}`}
                >
                    <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 py-3 backdrop-blur">
                        <div className="flex items-center gap-3">
                            {!isSidebarOpenMobile && (
                                <button
                                    className="md:hidden rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
                                    onClick={openSidebar}
                                >
                                    Recordings
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-3 ml-auto">
                            <div className="flex items-center gap-2">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-white">
                                    {user?.displayName
                                        ?.slice(0, 1)
                                        ?.toUpperCase() ?? "U"}
                                </div>
                                <div className="hidden flex-col text-xs text-slate-400 sm:flex">
                                    <span className="text-slate-200">
                                        {user?.displayName ??
                                            user?.email ??
                                            "Unknown user"}
                                    </span>
                                    <button
                                        className="text-left text-xs text-brand hover:underline"
                                        onClick={() => {
                                            void logout();
                                        }}
                                    >
                                        Sign out
                                    </button>
                                </div>
                            </div>
                        </div>
                    </header>

                    <main className="flex-1 overflow-y-auto h-full">
                        <div className="h-full min-h-0">{children}</div>
                    </main>
                </div>
            </div>
        </MobileSidebarContext.Provider>
    );
}
