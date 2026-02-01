const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
} as const;

function timestamp(): string {
  return new Date().toISOString().slice(11, 19);
}

export const log = {
  info(msg: string): void {
    console.log(`${COLORS.dim}[${timestamp()}]${COLORS.reset} ${msg}`);
  },
  success(msg: string): void {
    console.log(`${COLORS.green}[${timestamp()}] ${msg}${COLORS.reset}`);
  },
  warn(msg: string): void {
    console.log(`${COLORS.yellow}[${timestamp()}] ${msg}${COLORS.reset}`);
  },
  error(msg: string): void {
    console.error(`${COLORS.red}[${timestamp()}] ${msg}${COLORS.reset}`);
  },
  step(n: number, total: number, msg: string): void {
    console.log(`${COLORS.cyan}[${n}/${total}]${COLORS.reset} ${msg}`);
  },
  header(msg: string): void {
    console.log(`\n${COLORS.bold}${msg}${COLORS.reset}`);
  },
};
