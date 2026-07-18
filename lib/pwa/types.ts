export interface StoreManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose: string;
}

export interface WebAppManifest {
  id: string;
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  scope: string;
  display: string;
  display_override?: string[];
  orientation: string;
  background_color: string;
  theme_color: string;
  lang: string;
  icons: StoreManifestIcon[];
}
