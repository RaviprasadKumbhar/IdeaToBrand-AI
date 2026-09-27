const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ANTIDEPLOY_BASE = 'https://antideploy.com/api/v1';
const CONFIG_PATH = path.join(process.env.USERPROFILE || process.env.HOME, '.antideploy', 'config.json');

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollDeviceToken(deviceCode, intervalSec = 5, maxAttempts = 180) {
  console.log('[Antideploy] Polling for user browser authorization...');
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${ANTIDEPLOY_BASE}/device/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceCode }),
      });

      const data = await res.json();
      if (res.ok && data.token) {
        console.log('[Antideploy] User successfully authorized in browser!');
        const dir = path.dirname(CONFIG_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(CONFIG_PATH, JSON.stringify({ token: data.token }, null, 2));
        return data.token;
      }

      if (data.error === 'authorization_pending') {
        process.stdout.write('.');
      } else if (data.error === 'access_denied') {
        throw new Error('User denied authorization in browser.');
      } else if (data.error === 'expired_token') {
        throw new Error('Device code expired.');
      } else {
        console.log('\n[Antideploy] Poll notice:', data);
      }
    } catch (err) {
      if (err.message.includes('denied') || err.message.includes('expired')) {
        throw err;
      }
    }
    await sleep(intervalSec * 1000);
  }
  throw new Error('Device authorization timed out.');
}

function getStoredToken() {
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      if (parsed.token) return parsed.token;
    } catch {}
  }
  return null;
}

async function getOrCreateApplication(token, appName = 'ideatobrand-ai') {
  console.log(`\n[Antideploy] Resolving application "${appName}"...`);
  
  // First check existing applications
  const listRes = await fetch(`${ANTIDEPLOY_BASE}/applications`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  if (listRes.ok) {
    const apps = await listRes.json();
    if (Array.isArray(apps)) {
      const found = apps.find((a) => a.name === appName || a.name === 'ideatobrand-ai' || a.name === 'inkloom');
      if (found) {
        console.log(`[Antideploy] Found existing application: ${found.name} (${found.applicationId})`);
        return found;
      }
    }
  }

  // Create if not found
  const createRes = await fetch(`${ANTIDEPLOY_BASE}/applications`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: appName }),
  });

  const created = await createRes.json();
  if (createRes.ok) {
    console.log(`[Antideploy] Created new application: ${created.name} (${created.applicationId})`);
    return created;
  }

  if (created.code === 'name_taken' && created.applicationId) {
    console.log(`[Antideploy] Application name taken, using existing id: ${created.applicationId}`);
    return created;
  }

  throw new Error(`Failed to create application: ${JSON.stringify(created)}`);
}

async function configureSecrets(token, applicationId) {
  console.log('[Antideploy] Configuring production environment secrets...');
  
  // Read local .env if present for existing secrets
  const envContent = {};
  const rootEnv = path.resolve(__dirname, '../.env');
  if (fs.existsSync(rootEnv)) {
    const lines = fs.readFileSync(rootEnv, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (key && val) envContent[key] = val;
      }
    }
  }

  const secrets = {
    NODE_ENV: 'production',
    AI_PROVIDER: envContent.AI_PROVIDER || 'OPENAI',
    OPENAI_MODEL: 'gpt-4o-mini',
    SUPABASE_URL: envContent.SUPABASE_URL || 'https://zksrwnojdjfddhmvhpxm.supabase.co',
    SUPABASE_ANON_KEY: envContent.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inprc3J3bm9qZGpmZGRobXZocHhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0MTcyODMsImV4cCI6MjEwNTk5MzI4M30.mHoOvczo4YsDCmmui257UNA7NaoFP3u789J5xSnKGsA',
    VITE_SUPABASE_URL: envContent.VITE_SUPABASE_URL || 'https://zksrwnojdjfddhmvhpxm.supabase.co',
    VITE_SUPABASE_ANON_KEY: envContent.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inprc3J3bm9qZGpmZGRobXZocHhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0MTcyODMsImV4cCI6MjEwNTk5MzI4M30.mHoOvczo4YsDCmmui257UNA7NaoFP3u789J5xSnKGsA',
  };

  if (envContent.OPENAI_API_KEY && envContent.OPENAI_API_KEY.startsWith('sk-')) {
    secrets.OPENAI_API_KEY = envContent.OPENAI_API_KEY;
  }
  if (envContent.GEMINI_API_KEY) {
    secrets.GEMINI_API_KEY = envContent.GEMINI_API_KEY;
  }

  const putRes = await fetch(`${ANTIDEPLOY_BASE}/secrets?applicationId=${applicationId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ env: secrets }),
  });

  if (!putRes.ok) {
    const errText = await putRes.text();
    console.warn('[Antideploy] Warning configuring secrets:', errText);
  } else {
    console.log('[Antideploy] Secrets successfully configured!');
  }
}

async function createArchive() {
  const rootDir = path.resolve(__dirname, '..');
  const archivePath = path.resolve(rootDir, 'deploy_bundle.tar.gz');
  if (fs.existsSync(archivePath)) fs.unlinkSync(archivePath);

  console.log('[Antideploy] Creating tar.gz project archive...');
  const tarCmd = `tar.exe -czf "${archivePath}" --exclude=".git" --exclude="node_modules" --exclude="dist" --exclude="*.tsbuildinfo" --exclude="*.tar.gz" .`;
  execSync(tarCmd, { cwd: rootDir, stdio: 'inherit' });

  const sizeMb = (fs.statSync(archivePath).size / (1024 * 1024)).toFixed(2);
  console.log(`[Antideploy] Archive created successfully: ${archivePath} (${sizeMb} MB)`);
  return archivePath;
}

async function uploadDeploy(token, applicationId, archivePath) {
  console.log('[Antideploy] Uploading project archive to /api/v1/deploy...');
  const archiveBuffer = fs.readFileSync(archivePath);
  const blob = new Blob([archiveBuffer], { type: 'application/gzip' });

  const formData = new FormData();
  formData.append('archive', blob, 'deploy_bundle.tar.gz');
  formData.append('force', 'true');

  const res = await fetch(`${ANTIDEPLOY_BASE}/deploy?applicationId=${applicationId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Deployment upload failed: ${JSON.stringify(data)}`);
  }

  console.log('[Antideploy] Upload accepted! Task ID:', data.taskId);
  console.log('[Antideploy] Dashboard URL:', data.dashboard || 'n/a');
  return data.taskId;
}

async function pollDeploymentStatus(token, taskId) {
  console.log('[Antideploy] Monitoring deployment progress...');
  let lastStep = '';

  for (let i = 0; i < 120; i++) {
    const res = await fetch(`${ANTIDEPLOY_BASE}/deployments/${taskId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const data = await res.json();
      const currentStep = data.currentStep || data.status;
      if (currentStep !== lastStep) {
        console.log(`[Antideploy] Step: ${currentStep} (${data.status})`);
        lastStep = currentStep;
      }

      if (data.status === 'succeeded') {
        console.log('\n======================================================');
        console.log('✓ ANTIDEPLOY DEPLOYMENT SUCCEEDED!');
        console.log('======================================================');
        console.log('Live URL:', data.url || data.liveUrl || data.endpoint || data.domain);
        console.log('Detected Spec:', JSON.stringify(data.spec || {}, null, 2));
        if (data.warnings && data.warnings.length) console.log('Warnings:', data.warnings);
        if (data.hazards && data.hazards.length) console.log('Hazards:', data.hazards);
        return data;
      }

      if (data.status === 'failed') {
        console.error('\n[Antideploy] Deployment FAILED!');
        console.error('Error:', data.error || data.message || JSON.stringify(data));
        throw new Error(`Deployment failed: ${data.error || data.message}`);
      }
    } else {
      console.log('[Antideploy] Waiting for status update...');
    }

    await sleep(4000);
  }
  throw new Error('Deployment monitoring timed out after 8 minutes.');
}

async function main() {
  const deviceCode = process.argv[2];
  let token = getStoredToken();

  if (!token) {
    if (!deviceCode) {
      console.error('Error: No stored token and no deviceCode provided.');
      process.exit(1);
    }
    token = await pollDeviceToken(deviceCode);
  } else {
    console.log('[Antideploy] Using stored account token from ~/.antideploy/config.json');
  }

  const app = await getOrCreateApplication(token, 'ideatobrand-ai');
  const appId = app.applicationId;
  fs.writeFileSync(path.resolve(__dirname, '../.antideploy.json'), JSON.stringify({ applicationId: appId }, null, 2));

  await configureSecrets(token, appId);
  const archivePath = await createArchive();
  const taskId = await uploadDeploy(token, appId, archivePath);

  // Clean up archive
  if (fs.existsSync(archivePath)) fs.unlinkSync(archivePath);

  const finalDeployment = await pollDeploymentStatus(token, taskId);
  console.log('[Antideploy] Complete deployment details:', JSON.stringify(finalDeployment, null, 2));
}

main().catch((err) => {
  console.error('\n[Antideploy Error]:', err.message);
  process.exit(1);
});
