// Node tests run source modules without Vite's build-time define replacement.
if (!process.env.VITE_API_URL) throw new Error('Set VITE_API_URL for frontend tests.');
globalThis.__PRESQIO_API_BASE_URL__ = process.env.VITE_API_URL.replace(/\/+$/, '');
