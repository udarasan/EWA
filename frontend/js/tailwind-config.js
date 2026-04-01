tailwind.config = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
        display: ['Fraunces', "Georgia", "serif"],
      },
      colors: {
        brand: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
        },
        ink: {
          50: "#f8fafc",
          100: "#f1f5f9",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },
      },
      boxShadow: {
        soft: "0 2px 20px -4px rgba(15, 23, 42, 0.08)",
        card: "0 4px 28px -6px rgba(15, 23, 42, 0.12)",
        glow: "0 0 0 1px rgba(20, 184, 166, 0.15), 0 8px 32px -8px rgba(13, 148, 136, 0.25)",
      },
      backgroundImage: {
        "mesh":
          "radial-gradient(at 40% 20%, rgba(20, 184, 166, 0.12) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(59, 130, 246, 0.08) 0px, transparent 45%), radial-gradient(at 0% 100%, rgba(245, 158, 11, 0.06) 0px, transparent 50%)",
      },
    },
  },
};
