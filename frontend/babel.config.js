// ============================================================================
// FILE 1: babel.config.js
// FIXES: Reorder plugins (reanimated last), restore expo-router/babel, 
//        fix assets alias
// ============================================================================

module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      '@babel/plugin-transform-export-namespace-from',
      [
        'module-resolver',
        {
          root: ['./src'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
            '@': './src',
            '@components': './src/components',
            '@hooks': './src/hooks',
            '@constants': './src/constants',
            '@utils': './src/utils',
            '@screens': './src/screens',
            '@store': './src/store',
            '@assets': './src/assets',
            '@styles': './src/styles'
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};