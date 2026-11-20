import type { Tokens } from "./api";
declare global {
  interface Window {
    leaklensDesktop?: {
      readonly isDesktop: true;
      credentials(): Promise<Tokens>;
    };
  }
}
export const isDesktop = window.leaklensDesktop?.isDesktop === true;
