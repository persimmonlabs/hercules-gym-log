const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Fix: react-native-purchases-ui and its internal dependency have a
// "source" field pointing to TypeScript src/ that Metro tries to resolve
// before "main". This causes resolution failures for some dist modules.
// Force Metro to prefer "main" over "source" for RevenueCat packages.
const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // For the internal purchases package, force resolution from dist/
  if (
    moduleName === '@revenuecat/purchases-typescript-internal' ||
    (context.originModulePath &&
      context.originModulePath.includes('@revenuecat') &&
      context.originModulePath.includes('purchases-typescript-internal') &&
      moduleName.startsWith('./'))
  ) {
    // Let default resolution handle it but ensure we resolve from dist
    const internalPkgDir = path.join(
      __dirname,
      'node_modules',
      '@revenuecat',
      'purchases-typescript-internal',
      'dist'
    );

    if (moduleName.startsWith('./')) {
      const fullPath = path.join(internalPkgDir, moduleName + '.js');
      return {
        filePath: fullPath,
        type: 'sourceFile',
      };
    }
  }

  // Default resolution for everything else
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
