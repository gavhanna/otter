import { createFileRoute } from '@tanstack/react-router';
import { RecentPage } from '../../pages/RecentPage';

export const Route = createFileRoute('/_app/recent')({
  component: RecentPage,
});
