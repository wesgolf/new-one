module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}", "./index.html"],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Poppins', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body:    ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        background: "#f5f7fb",
        text: {
          primary:   "#1e293b",
          secondary: "#64748b",
          muted:     "#94a3b8",
        },
        surface: {
          raised: "#ffffff",
          glass:  "rgba(255, 255, 255, 0.75)",
        },
        border:         "#e2e8f0",
        brand:          "#2563eb",
        "brand-hover":  "#1d4ed8",
        // Music-grade indigo accent
        accent:         "#6366f1",
        "accent-hover": "#4f46e5",
        // CTA green (play / confirm)
        cta:            "#22c55e",
        "cta-hover":    "#16a34a",
      },
      zIndex: {
        nav:      "10",
        dropdown: "20",
        drawer:   "30",
        modal:    "50",
        toast:    "60",
      },
      transitionDuration: {
        micro: "150",
        base:  "200",
        slow:  "300",
      },
    },
  },
  plugins: [],
};
