/**
 * Jest 設定ファイル（教育用）
 * 
 * === この設定ファイルで学べること ===
 * 1. TypeScriptテストの設定方法
 * 2. カバレッジ計測の設定
 * 3. テストファイルの検索パターン
 * 4. カバレッジ閾値の設定
 * 
 * === 参考ドキュメント ===
 * https://jestjs.io/docs/configuration
 */

import type { Config } from 'jest';

const config: Config = {
  /**
   * TypeScriptをサポートするプリセット
   * 
   * 学習ポイント：
   * - ts-jestを使ってTypeScriptファイルを直接テスト可能
   * - トランスパイルを自動で行う
   */
  preset: 'ts-jest',

  /**
   * テスト実行環境
   * 
   * 学習ポイント：
   * - 'node': Node.js環境（Lambda関数のテストに適している）
   * - 'jsdom': ブラウザ環境をシミュレート（フロントエンドテスト用）
   */
  testEnvironment: 'node',

  /**
   * テストファイルを検索するルートディレクトリ
   * 
   * 学習ポイント：
   * - <rootDir>はjest.config.tsがあるディレクトリを指す
   * - 複数指定可能
   */
  roots: ['<rootDir>'],

  /**
   * テストファイルのパターン
   * 
   * 学習ポイント：
   * - *.test.ts: テストファイルの命名規則
   * - *.spec.ts: 別の一般的な命名規則（お好みで追加可能）
   */
  testMatch: [
    '**/*.test.ts',
    // '**/*.spec.ts', // 必要に応じて追加
  ],

  /**
   * カバレッジ計測の対象ファイル
   * 
   * 学習ポイント：
   * - テストファイル自体は除外
   * - node_modulesは除外
   * - 実装ファイルのみを対象にする
   */
  collectCoverageFrom: [
    'app.ts',
    // 将来的にファイルが増えたら以下のパターンも使用可能
    // '**/*.ts',
    '!**/*.test.ts',
    '!**/*.spec.ts',
    '!**/node_modules/**',
    '!**/.aws-sam/**',
    '!**/dist/**',
  ],

  /**
   * カバレッジレポートの出力先
   * 
   * 学習ポイント：
   * - HTMLレポートを生成してブラウザで確認可能
   */
  coverageDirectory: 'coverage',

  /**
   * カバレッジレポートの形式
   * 
   * 学習ポイント：
   * - text: ターミナルに表示
   * - lcov: HTML形式でレポート生成
   * - json: CI/CD連携用
   */
  coverageReporters: ['text', 'lcov', 'html'],

  /**
   * カバレッジの最小閾値
   * 
   * 学習ポイント：
   * - 80%以上をキープすることで品質を担保
   * - branches: 分岐網羅率（if文などの全パターン）
   * - functions: 関数網羅率（全関数が実行されたか）
   * - lines: 行網羅率（全行が実行されたか）
   * - statements: 文網羅率（全文が実行されたか）
   * 
   * 教育目的の調整：
   * - 最初は60%程度から始めて、徐々に上げることを推奨
   * - 本番プロジェクトでは80-90%を目指す
   */
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  /**
   * テストのタイムアウト時間（ミリ秒）
   * 
   * 学習ポイント：
   * - デフォルトは5000ms
   * - DynamoDBモックは高速なので短めでOK
   */
  testTimeout: 5000,

  /**
   * 詳細な出力を表示
   * 
   * 学習ポイント：
   * - true: 各テストケースの詳細を表示
   * - false: サマリーのみ表示
   */
  verbose: true,

  /**
   * ファイルの変更を検出して自動テスト実行する際の設定
   * 
   * 学習ポイント：
   * - node_modules配下の変更は無視
   */
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/.aws-sam/',
    '/coverage/',
    '/dist/',
  ],

  /**
   * グローバルなセットアップファイル（オプション）
   * 
   * 学習ポイント：
   * - 全テスト実行前に1度だけ実行される
   * - 環境変数の設定などに使用
   */
  // globalSetup: './jest.global-setup.ts',

  /**
   * グローバルなティアダウンファイル（オプション）
   * 
   * 学習ポイント：
   * - 全テスト実行後に1度だけ実行される
   * - クリーンアップ処理に使用
   */
  // globalTeardown: './jest.global-teardown.ts',

  /**
   * 各テストファイル実行前のセットアップ（オプション）
   * 
   * 学習ポイント：
   * - 各テストファイルごとに実行される
   * - モックの初期化などに使用
   */
  // setupFilesAfterEnv: ['./jest.setup.ts'],
};

export default config;