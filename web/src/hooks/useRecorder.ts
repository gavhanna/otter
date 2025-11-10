import { useCallback, useEffect, useRef, useState } from 'react';
import { formatDefaultRecordingName } from '../lib/utils';

export type RecorderState = 'idle' | 'recording' | 'paused' | 'preview';

const SUPPORTS_MEDIA_RECORDER =
  typeof window !== 'undefined' &&
  typeof navigator !== 'undefined' &&
  'mediaDevices' in navigator &&
  'MediaRecorder' in window;

export function useRecorder() {
  const [state, setState] = useState<RecorderState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [durationMs, setDurationMs] = useState<number>(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [visualizerData, setVisualizerData] = useState<Uint8Array | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationRef = useRef<number | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      cleanupMedia();
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl]);

  const startRecording = useCallback(async () => {
    if (!SUPPORTS_MEDIA_RECORDER) {
      setError('Recording not supported in this browser.');
      return;
    }
    if (state === 'recording') {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        setAudioBlob(blob);
        setAudioUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });

        const finalDuration = Date.now() - recordingStartTimeRef.current;
        setDurationMs(finalDuration);

        setState('preview');
        cleanupMedia();
      };

      recorder.start();
      recorderRef.current = recorder;
      streamRef.current = stream;
      recordingStartTimeRef.current = Date.now();
      startTimeRef.current = Date.now();
      pausedTimeRef.current = 0;
      setError(null);
      setDurationMs(0);
      setTitle(formatDefaultRecordingName());
      setState('recording');

      intervalRef.current = window.setInterval(() => {
        setDurationMs(Date.now() - recordingStartTimeRef.current);
      }, 100);

      setupAudioVisualizer(stream);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to access microphone'
      );
      cleanupMedia();
    }
  }, [state]);

  const pauseRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.pause();
      pausedTimeRef.current = Date.now();
      setState('paused');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === 'paused') {
      recorderRef.current.resume();
      const pauseDuration = Date.now() - pausedTimeRef.current;
      recordingStartTimeRef.current += pauseDuration;
      pausedTimeRef.current = 0;
      setState('recording');
      intervalRef.current = window.setInterval(() => {
        setDurationMs(Date.now() - recordingStartTimeRef.current);
      }, 100);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (
      recorderRef.current &&
      (recorderRef.current.state === 'recording' ||
        recorderRef.current.state === 'paused')
    ) {
      recorderRef.current.stop();
      setState('preview');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, []);

  const resetRecorder = useCallback(() => {
    setState('idle');
    setError(null);
    setTitle('');
    setDurationMs(0);
    setAudioBlob(null);
    setAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    recordingStartTimeRef.current = 0;
    pausedTimeRef.current = 0;
    cleanupMedia();
  }, []);

  function setupAudioVisualizer(stream: MediaStream) {
    try {
      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
      visualize();
    } catch (error) {
      console.warn('Audio visualizer setup failed:', error);
    }
  }

  function visualize() {
    if (!analyserRef.current || !dataArrayRef.current) return;
    analyserRef.current.getByteFrequencyData(dataArrayRef.current as any);
    setVisualizerData(new Uint8Array(dataArrayRef.current));
    animationRef.current = requestAnimationFrame(visualize);
  }

  function cleanupMedia() {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setVisualizerData(null);
  }

  return {
    state,
    error,
    setError,
    title,
    setTitle,
    durationMs,
    audioBlob,
    audioUrl,
    visualizerData,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    resetRecorder,
    supportsMediaRecorder: SUPPORTS_MEDIA_RECORDER,
  };
}
