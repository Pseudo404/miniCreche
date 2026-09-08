import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'fr.minicreche.tablette',
  appName: 'Mini Crèche',
  // Next.js creates the self-contained application in `out` with `output: "export"`.
  webDir: 'out',
  // The API remains inside the encrypted WireGuard network; Android must still
  // explicitly allow its HTTP URL until we configure a private HTTPS certificate.
  server: {
    cleartext: true,
    // The API is transported inside WireGuard. Serving the local WebView over
    // HTTP prevents Android WebView from blocking that private HTTP API as
    // mixed content.
    androidScheme: 'http',
  },
};

export default config;
