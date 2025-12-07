import type { ConfigContext, ExpoConfig } from '@expo/config';

import appJson from './app.json';

const PREVIEW_PROFILE = 'preview';

export default (_: ConfigContext): ExpoConfig => {
  const buildProfile = process.env.EAS_BUILD_PROFILE ?? '';
  const isPreviewBuild = buildProfile === PREVIEW_PROFILE;

  // Cast to ExpoConfig to handle runtimeVersion.policy type inference
  const baseConfig = appJson.expo as ExpoConfig;

  const expoConfig: ExpoConfig = {
    ...baseConfig,
    updates: {
      ...baseConfig.updates,
    },
  };

  if (isPreviewBuild) {
    expoConfig.updates = {
      ...expoConfig.updates,
      enabled: false,
    };
  }

  return expoConfig;
};
