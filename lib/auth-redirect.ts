import { makeRedirectUri } from 'expo-auth-session';
import Constants from 'expo-constants';

export function getOAuthRedirectUri() {
  const schemeConfig = Constants.expoConfig?.scheme;
  const scheme = Array.isArray(schemeConfig) ? schemeConfig[0] : (schemeConfig ?? 'trackk');
  const isExpoGo =
    Constants.executionEnvironment === 'storeClient' && Constants.expoGoConfig != null;

  if (isExpoGo) {
    return makeRedirectUri({
      path: 'auth/callback',
    });
  }

  return makeRedirectUri({
    scheme,
    path: 'auth/callback',
  });
}
