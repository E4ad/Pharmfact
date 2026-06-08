import { createApp } from './app.js';

const port = Number(process.env.API_PORT ?? process.env.PDF_SERVER_PORT ?? 3001);
const app = createApp({ port });

app.listen(port, () => {
  console.log(`PDF/API server listening on http://localhost:${port}`);
});
