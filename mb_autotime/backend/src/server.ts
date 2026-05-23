import app from './app.js';

const PORT = process.env.PORT ?? 5000;

app.listen(PORT, () => {
  console.log(`✅  MB AutoTime API running on http://localhost:${PORT}`);
  console.log(`    ENV: ${process.env.NODE_ENV ?? 'development'}`);
});

// trigger ci