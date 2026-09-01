import { wordpressProvider } from "./wordpress-provider";
import { customWebsiteProvider } from "./custom-website-provider";
import type { CMSProvider } from "./provider";
import type { CMSType } from "./types";

export function getProviderForType(cmsType: CMSType): CMSProvider {
  switch (cmsType) {
    case "CUSTOM_API":
      return customWebsiteProvider;
    case "WORDPRESS":
      return wordpressProvider;
  }
}
