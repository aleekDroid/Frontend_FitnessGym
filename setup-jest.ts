import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

setupZoneTestEnv();
(globalThis as any).atob = (str: string) => Buffer.from(str, 'base64').toString('binary');
(globalThis as any).btoa = (str: string) => Buffer.from(str, 'binary').toString('base64');
