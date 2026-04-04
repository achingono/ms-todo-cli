export const _exit = (code: number): void => { process.exit(code); };

export function printSuccess(data: object): void {
  console.log(JSON.stringify({ ok: true, ...data }));
}

export function printError(code: string, message: string): void {
  console.log(JSON.stringify({ ok: false, error: { code, message } }));
  _exit(1);
}
