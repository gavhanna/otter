import { useQuery, type QueryClient } from '@tanstack/react-query';
import { api, type RecordingSummary } from '../lib/api';

export const recordingsQueryKey = ['recordings'] as const;

export const recordingQueryKey = (recordingId: string) =>
  ['recording', recordingId] as const;

export function useRecordingsQuery(enabled: boolean) {
  return useQuery({
    queryKey: recordingsQueryKey,
    queryFn: async () => {
      const response = await api.listRecordings();
      return response.recordings;
    },
    enabled,
  });
}

export function useRecordingQuery(recordingId: string | null) {
  return useQuery({
    queryKey: recordingId ? recordingQueryKey(recordingId) : ['recording', null],
    queryFn: async () => {
      if (!recordingId) return null;
      const response = await api.getRecording(recordingId);
      return response.recording;
    },
    enabled: Boolean(recordingId),
  });
}

export function patchRecordingInCaches(
  queryClient: QueryClient,
  recordingId: string,
  updater: (recording: RecordingSummary) => RecordingSummary
) {
  queryClient.setQueryData<RecordingSummary | null | undefined>(
    recordingQueryKey(recordingId),
    (existing) => (existing ? updater(existing) : existing)
  );

  queryClient.setQueryData<RecordingSummary[] | undefined>(
    recordingsQueryKey,
    (existing) =>
      existing
        ? existing.map((recording) =>
            recording.id === recordingId ? updater(recording) : recording
          )
        : existing
  );
}

export function removeRecordingFromCaches(
  queryClient: QueryClient,
  recordingId: string
) {
  queryClient.removeQueries({ queryKey: recordingQueryKey(recordingId) });
  queryClient.setQueryData<RecordingSummary[] | undefined>(
    recordingsQueryKey,
    (existing) =>
      existing ? existing.filter((recording) => recording.id !== recordingId) : existing
  );
}
