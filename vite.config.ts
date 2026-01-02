import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// IMPORTANT: replace with your repo name
const repoName = "test";

export default defineConfig({
  plugins: [react()],
  base: `/${repoName}/`
});
