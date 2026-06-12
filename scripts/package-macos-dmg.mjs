import { mkdtempSync, rmSync, cpSync, symlinkSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const packageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
const tauriConfig = JSON.parse(readFileSync(join(rootDir, 'src-tauri', 'tauri.conf.json'), 'utf8'));

const productName = tauriConfig.productName ?? packageJson.name ?? 'App';
const version = packageJson.version ?? tauriConfig.version ?? '1.0.0';
const arch = process.env.DMG_ARCH
  ?? (process.arch === 'arm64' ? 'aarch64' : process.arch === 'x64' ? 'x64' : process.arch);

const bundleDir = join(rootDir, 'src-tauri', 'target', 'release', 'bundle', 'macos');
const appPath = join(bundleDir, `${productName}.app`);
const dmgPath = join(bundleDir, `${productName}_${version}_${arch}.dmg`);

if (!existsSync(appPath)) {
  throw new Error(`Application bundle introuvable: ${appPath}`);
}

const stagingDir = mkdtempSync(join(tmpdir(), 'pharmfact-dmg-'));
const stagingAppPath = join(stagingDir, `${productName}.app`);
const applicationsLink = join(stagingDir, 'Applications');

try {
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', appPath], { stdio: 'inherit' });
  execFileSync('codesign', ['--verify', '--deep', '--strict', '--verbose=2', appPath], { stdio: 'inherit' });

  cpSync(appPath, stagingAppPath, { recursive: true });
  symlinkSync('/Applications', applicationsLink);

  if (existsSync(dmgPath)) {
    rmSync(dmgPath);
  }

  execFileSync('hdiutil', ['makehybrid', '-hfs', '-o', dmgPath, stagingDir], { stdio: 'inherit' });
  console.log(`DMG créé: ${dmgPath}`);
} finally {
  rmSync(stagingDir, { recursive: true, force: true });
}
