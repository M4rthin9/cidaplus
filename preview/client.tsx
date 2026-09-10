import { hydrateRoot } from "react-dom/client";
import { PreviewApp } from "./app";
const root = document.getElementById("root");
if (root)
  hydrateRoot(
    root,
    <PreviewApp initialPath={document.documentElement.dataset.previewPath ?? "/"} />,
  );
