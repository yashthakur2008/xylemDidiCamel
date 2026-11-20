import type { Tokens } from "./api";
declare global {
  interface Window {
    leaklensDesktop?: {
      readonly isDesktop: true;
      credentials(): Promise<Tokens>;
      setDirty(dirty: boolean): Promise<void>;
    };
  }
}
export const isDesktop = window.leaklensDesktop?.isDesktop === true;
