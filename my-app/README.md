# SafeAI Chat

The chat client is built with Angular and served locally with Angular CLI.

## Run the client

From this directory, install dependencies and start the development server:

```powershell
npm install
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173).

## Run the API

The FastAPI server is in the parent directory. In a second terminal, run:

```powershell
..\.venv\Scripts\python.exe -m uvicorn server:app --host 127.0.0.1 --port 8000
```

The client sends chat requests to `http://localhost:8000/generate`.

## Production build

```powershell
npm run build
```

The generated files are written to `dist/`.
