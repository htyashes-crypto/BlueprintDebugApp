/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{html,ts,tsx}'],
  theme: {
    extend: {
      // 与 BlueprintDebugApp/preview.svg 调色板一致
      colors: {
        bg: {
          base: '#1e1e1e',
          panel: '#252525',
          panelAlt: '#2d2d2d',
          input: '#3c3c3c',
          tooltip: '#383838',
          titleBar: '#252526',
          titleBarGrad: '#323233'
        },
        border: {
          base: '#3e3e3e',
          subtle: '#555',
          tooltip: '#666'
        },
        fg: {
          base: '#cccccc',
          mute: '#888',
          muteBright: '#aaa',
          accent: '#9cdcfe'
        },
        accent: {
          blue: '#0098ff',
          blueDeep: '#094771',
          status: '#0078d4',
          highlight: '#ffd700',
          live: '#4ec9b0',
          danger: '#a1260d'
        },
        mac: {
          red: '#ff5f57',
          yellow: '#febc2e',
          green: '#28c840'
        }
      },
      fontFamily: {
        ui: ['"Segoe UI"', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
        mono: ['Consolas', '"JetBrains Mono"', '"SF Mono"', 'monospace']
      },
      fontSize: {
        '2xs': '11px',
        '3xs': '10px'
      }
    }
  },
  plugins: []
}
