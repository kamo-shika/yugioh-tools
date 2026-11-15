# yugioh-tools — 遊戯王 デュエルツール

GitHub Pages で公開する、対戦中に使う計算ツールです。UI は [Astryx](https://github.com/meta/astryx)（Meta の React デザインシステム）で作っています。

公開URL: https://kamo-shika.github.io/yugioh-tools/

## 機能

スマホの**横置き**で使うのを主に想定しています（縦置き・PCでも使えます）。

- **ライフ**（トップ画面）
  - 左右にプレイヤー、中央にテンキー。数値を打ってから、LPを動かしたい側の「ダメージ」「回復」を押す
  - テンキーは 00 / 000 付き、C（クリア）と ⌫（1文字消す）
  - 「半分」ボタン（端数切り上げ）
  - ダイス 🎲・コイン、履歴（右から出るパネル）、戻す、リセット（誤タップ防止で2回押し）
  - プレイヤー名はタップで変更
  - 対戦中は画面がスリープしないようにする（対応ブラウザのみ）
  - 状態はブラウザ（localStorage）に保存されるので、リロードしても消えません
  - ホーム画面に追加すると全画面・横向きで開けます
- **初手確率**
  - 超幾何分布で「初手に狙ったカードを引ける確率」を計算
  - 複数グループの AND 条件（例：初動札1枚以上 かつ 妨害札1枚以上）
  - 1枚以上引く確率の早見表

## 開発

```bash
npm install
npm run dev     # 開発サーバー
npm test        # 計算ロジックのテスト
npm run build   # dist/ に静的ファイルを出力
```

PR ではテストとビルドだけを実行し、`main` に push すると `.github/workflows/deploy.yml` が GitHub Pages へデプロイします。
初回のみ、リポジトリの Settings → Pages → Build and deployment の Source を **GitHub Actions** にしてください。
