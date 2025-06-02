import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface Recording {
  id: string
  title: string
  duration?: number
  status: "pending" | "done" | "error"
  createdAt: Date
}

export function RecordingInterface() {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [transcribing, setTranscribing] = useState(false)

  // Placeholder: Start/stop logic
  const startRecording = () => {
    setIsRecording(true)
    setRecordingTime(0)
    // TODO: Start timer and audio capture
  }
  const stopRecording = () => {
    setIsRecording(false)
    setTranscribing(true)
    // TODO: Stop timer and audio capture, save recording
    setTimeout(() => {
      setTranscribing(false)
      setRecordings([
        {
          id: Math.random().toString(36).slice(2),
          title: `Recording ${recordings.length + 1}`,
          duration: recordingTime,
          status: "done",
          createdAt: new Date(),
        },
        ...recordings,
      ])
    }, 1500)
  }

  // Timer effect (placeholder)
  // TODO: Use useEffect for real timer

  return (
    <div className="min-h-screen flex flex-col items-center bg-background px-4 py-8">
      <div className="w-full max-w-xl flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <span className="text-muted-foreground text-sm">
            {isRecording ? "Recording…" : transcribing ? "Transcribing…" : "Ready to Record"}
          </span>
          <span className="text-4xl font-mono tabular-nums">
            {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, "0")}
          </span>
          <Button
            size="icon"
            className={`mt-2 h-20 w-20 rounded-full text-2xl shadow-lg transition-all ${isRecording ? "bg-destructive animate-pulse" : "bg-primary"}`}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={transcribing}
            aria-label={isRecording ? "Stop recording" : "Start recording"}
          >
            {isRecording ? <span className="block w-6 h-6 bg-white rounded" /> : <span className="block w-8 h-8 bg-white rounded-full" />}
          </Button>
        </div>
        <div className="w-full mt-8">
          <h2 className="text-2xl font-bold mb-4">Your Recordings</h2>
          {recordings.length === 0 ? (
            <div className="text-muted-foreground text-center py-8">
              No recordings yet. Start recording to create your first one!
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {recordings.map((rec) => (
                <Card key={rec.id} className="flex items-center justify-between p-4">
                  <div>
                    <div className="font-medium">{rec.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {rec.status === "pending" ? "Processing…" : rec.status === "error" ? "Error" : rec.createdAt.toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono">
                      {rec.duration ? `${Math.floor(rec.duration / 60)}:${(rec.duration % 60).toString().padStart(2, "0")}` : "--:--"}
                    </span>
                    <Button size="sm" variant="outline">Play</Button>
                    <Button size="sm" variant="destructive">Delete</Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 