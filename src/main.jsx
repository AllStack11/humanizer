import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createTheme, MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import App from "./App.jsx";
import "./styles/app.css";

const theme = createTheme({
  primaryColor: "blue",
  defaultRadius: "lg",
  fontFamily: "Manrope, Inter, system-ui, sans-serif",
  headings: {
    fontFamily: "Manrope, Inter, system-ui, sans-serif",
  },
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <MantineProvider theme={theme}>
      <App />
    </MantineProvider>
  </StrictMode>
);
