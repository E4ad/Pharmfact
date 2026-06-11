import { spawnSync } from 'node:child_process';

const result = spawnSync(
  'cargo',
  ['test', 'generate_invoice_pdf_bytes_starts_with_pdf_header'],
  {
    cwd: 'src-tauri',
    stdio: 'inherit',
  },
);

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
