import { createFileRoute } from '@tanstack/react-router';
import { FavouritesPage } from '../../pages/FavouritesPage';

export const Route = createFileRoute('/_app/favourites')({
  component: FavouritesPage,
});
