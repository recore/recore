import { ReactType } from 'react';

export interface VisionXOptions {
  components?: { [key: string]: ReactType };
  helpers?: { [key: string]: any };
}

export default function inject({ components, helpers }: VisionXOptions) {
  return (ControllerType: any) => {
    if (components) {
      ControllerType.components = components;
    }
    if (helpers) {
      ControllerType.utils = helpers;
    }
  };
}
