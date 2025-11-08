import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/authStore";

interface MobileRecordingListProps {
  onRecordingSelect: (id: string) => void;
  onNewRecording: () => void;
}

export function MobileRecordingList({ onRecordingSelect, onNewRecording }: MobileRecordingListProps) {
  const { user, status } = useAuth();
  const [activeTab, setActiveTab] = useState<"all" | "recent" | "favourites">("all");

  const { data, isLoading, error } = useQuery({
    queryKey: ["recordings"],
    queryFn: async () => {
      const response = await api.listRecordings();
      return response.recordings;
    },
    enabled: status === "authenticated",
  });

  const recordings = user ? (data || []) : [];

  // Filter recordings based on selected tab
  const filteredRecordings = recordings.filter((recording) => {
    const recordingDate = new Date(
      recording.recordedAt ?? recording.createdAt
    );

    switch (activeTab) {
      case "recent": {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return recordingDate >= sevenDaysAgo;
      }
      case "favourites":
        return recording.isFavourited;
      default:
        return true;
    }
  });

  // Sort by most recent first
  const sortedRecordings = [...filteredRecordings].sort(
    (a, b) =>
      new Date(b.recordedAt ?? b.createdAt).getTime() -
      new Date(a.recordedAt ?? a.createdAt).getTime()
  );

  const formatDuration = (durationMs: number) => {
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "Today";
    if (diffDays === 2) return "Yesterday";
    if (diffDays <= 7) return `${diffDays - 1} days ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  if (status !== "authenticated") {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="px-4 py-3">
          <h1 className="text-xl font-semibold text-white">Recordings</h1>
        </div>

        {/* Tabs */}
        <div className="flex px-2 pb-2">
          {[
            { id: "all", label: "All" },
            { id: "recent", label: "Recent" },
            { id: "favourites", label: "Favorites" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.id
                  ? "bg-brand text-slate-950"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recording List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-slate-400">
            Loading recordings...
          </div>
        ) : error ? (
          <div className="p-4 text-center text-rose-400">
            Failed to load recordings
          </div>
        ) : sortedRecordings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No recordings yet</h3>
            <p className="text-slate-400 mb-6">Tap the record button to create your first recording</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {sortedRecordings.map((recording) => (
              <button
                key={recording.id}
                onClick={() => onRecordingSelect(recording.id)}
                className="w-full px-4 py-3 text-left hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white truncate">
                      {recording.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                      <span>{formatDate(recording.recordedAt || recording.createdAt)}</span>
                      <span>•</span>
                      <span>{formatDuration(recording.durationMs)}</span>
                    </div>
                  </div>
                  {recording.isFavourited && (
                    <svg className="w-4 h-4 text-brand flex-shrink-0 ml-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Floating Record Button */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
        <button
          onClick={onNewRecording}
          className="w-16 h-16 rounded-full bg-brand text-slate-950 hover:bg-orange-400 hover:scale-105 flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95"
        >
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="8" />
          </svg>
        </button>
      </div>
    </div>
  );
}