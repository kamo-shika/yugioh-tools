import {defineConfig, type Plugin} from 'vite';
import react from '@vitejs/plugin-react';

// 公開のたびに変わる版。GitHub Actions ではコミットのハッシュ、手元ではビルドした時刻
const version = process.env.GITHUB_SHA?.slice(0, 12) ?? `local-${Date.now()}`;

/** 公開中の版を画面から確かめられるように version.json を出力する */
const versionFile = (): Plugin => ({
  name: 'version-file',
  apply: 'build',
  generateBundle() {
    this.emitFile({type: 'asset', fileName: 'version.json', source: JSON.stringify({version})});
  },
});

// GitHub Pages は https://<user>.github.io/<repo>/ で配信されるため base を合わせる
export default defineConfig(({command}) => ({
  base: process.env.PAGES_BASE ?? '/yugioh-tools/',
  plugins: [react(), versionFile()],
  define: {__APP_VERSION__: JSON.stringify(command === 'build' ? version : 'dev')},
}));
