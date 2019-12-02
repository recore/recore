declare const VERSION: string;

const version: string = VERSION;

if (process.env.NODE_ENV !== 'test') {
  if (process.env.NODE_ENV !== 'production') {
    // tslint:disable-next-line
    console.log(
      `%cRecore %cv${version} %cdevelopment`,
      'color:#000;font-weight:bold;',
      'color:green;font-weight:bold;',
      'color:orange;font-weight:bold;',
    );
  } else {
    // tslint:disable-next-line
    console.log(`%cRecore %cv${version}`, 'color:#000;font-weight:bold;', 'color:green;font-weight:bold;');
  }
}

export * from './core';
export * from './obx';
export * from './lib';
export { version };
