export interface Theme {
  bg: string;
  border: string;
  text: string;
  subtext: string;
  accent: string;
  barBg: string;
}

const themes: Record<string, Theme> = {
  default: {
    bg: "#0f1923",
    border: "#1f2d3d",
    text: "#ffffff",
    subtext: "#8b9bb4",
    accent: "#0072ce",
    barBg: "#1f2d3d",
  },
  light: {
    bg: "#ffffff",
    border: "#d0d7de",
    text: "#1f2328",
    subtext: "#57606a",
    accent: "#0072ce",
    barBg: "#eaeef2",
  },
  blue: {
    bg: "#003791",
    border: "#1a4ba1",
    text: "#ffffff",
    subtext: "#a8c4f0",
    accent: "#ffffff",
    barBg: "#1a4ba1",
  },
  midnight: {
    bg: "#0d1117",
    border: "#30363d",
    text: "#e6edf3",
    subtext: "#8b949e",
    accent: "#58a6ff",
    barBg: "#21262d",
  },
};

export const trophyColors = {
  platinum: "#7a96d1",
  gold: "#e5b53a",
  silver: "#b4b4b4",
  bronze: "#bf6a3a",
} as const;

export function resolveTheme(name?: string): Theme {
  return themes[name ?? "default"] ?? themes.default;
}

export const themeNames = Object.keys(themes);
