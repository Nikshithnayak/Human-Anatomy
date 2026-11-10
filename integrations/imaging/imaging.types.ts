export interface OhifStatusResponse {
  status: string;
  repository: string;
  localPath: string;
  license: string;
  version: string;
  embeddedPackages: {
    dicomParser: string;
    dcmjs: string;
  };
  supportedModes: string[];
  hangingProtocols: unknown[];
  dicomWebPresets: unknown[];
  companionApp: {
    script: string;
    defaultUrl: string;
    note: string;
  };
}
