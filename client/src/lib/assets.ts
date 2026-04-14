import { apiBaseUrl } from './constants';

export const resolveAssetUrl = (value?: string | null) => {
  if (!value) {
    return undefined;
  }

  if (/^(https?:)?\/\//.test(value) || value.startsWith('data:') || value.startsWith('blob:')) {
    return value;
  }

  if (!value.startsWith('/')) {
    return value;
  }

  try {
    const apiUrl = new URL(apiBaseUrl);
    return new URL(value, apiUrl.origin).toString();
  } catch {
    return value;
  }
};
