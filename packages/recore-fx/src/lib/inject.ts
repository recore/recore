import { ReactType } from 'react';

export interface VisionXOptions {
  components?: { [key: string]: ReactType };
  helpers?: { [key: string]: any };
}

export default function inject({ components, helpers }: VisionXOptions) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('"inject" is deprecated, use ViewController.components/utils instead');
  }
  return (ControllerType: any) => {
    if (components) {
      ControllerType.components = components;
    }
    if (helpers) {
      ControllerType.utils = helpers;
    }
  };
}
