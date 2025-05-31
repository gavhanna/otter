import express from 'express';
import cors from 'cors';
import * as trpcExpress from '@trpc/server/adapters/express';
import { createContext } from './trpc/context';
import { appRouter } from './trpc/routers/_app'; // We will create this next

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors()); // Configure CORS appropriately for your frontend
app.use(express.json());

// tRPC Middleware
app.use(
  '/trpc',
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  }),
);

app.get('/', (req, res) => {
  res.send('Hello from Otter Server!');
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

export type AppRouter = typeof appRouter; 