module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}", "./index.html"],
  theme: {
    extend: {
      colors: {
        background: "#f5f7fb", // Define the background color
        text: {
          primary: "#1e293b",
          secondary: "#64748b",
          muted: "#94a3b8",
        },
        surface: {
          raised: "#ffffff",
          glass: "rgba(255, 255, 255, 0.75)",
        },
        border: "#e2e8f0",
        brand: "#2563eb",
        "brand-hover": "#1d4ed8",
      },
    },
  },
  plugins: [],
};