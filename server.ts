import express from "express";
import { createServer as createViteServer } from "vite";
import { spawn } from "child_process";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- NEURAL GOVERNOR TRAINING ENDPOINT ---
  app.post("/api/train", (req, res) => {
    console.log("[SYSTEM] Initiating Neural Governor Training...");
    
    // Spawn the python process
    const pythonProcess = spawn("python3", ["neural_governor_train.py"]);
    
    let output = "";
    let error = "";

    pythonProcess.stdout.on("data", (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      error += data.toString();
    });

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        console.error(`[ERROR] Training failed with code ${code}: ${error}`);
        return res.status(500).json({ error: "Training failed", details: error });
      }

      // Extract loss history from output
      const lines = output.split("\n");
      const completeIdx = lines.indexOf("TRAINING_COMPLETE");
      
      if (completeIdx !== -1 && lines[completeIdx + 1]) {
        try {
          const lossHistory = JSON.parse(lines[completeIdx + 1]);
          console.log("[SYSTEM] Training complete. Yielding loss history.");
          return res.json({ success: true, lossHistory });
        } catch (e) {
          console.error("[ERROR] Failed to parse loss history:", e);
          return res.status(500).json({ error: "Failed to parse loss history" });
        }
      }

      res.json({ success: true, message: "Training finished without loss data" });
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[IGNIS] Sovereign Server running on http://localhost:${PORT}`);
  });
}

startServer();
