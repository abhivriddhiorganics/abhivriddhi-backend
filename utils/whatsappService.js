// const { Client, LocalAuth } = require('whatsapp-web.js'); // Moved to lazy load inside initializeWhatsApp

const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

let client;
let isReady = false;
let isInitializing = false;
let qrString = '';
let connectionStatus = 'Disconnected'; // Disconnected, Initializing, Ready

/**
 * Helper to cleanup potential locks and zombie processes scoped to this app
 */
const killBrowserProcesses = () => {
    return new Promise((resolve) => {
        // We only want to cleanup locks, not kill the user's actual browser
        console.log('[WhatsApp] Skipping system-wide browser kill for stability...');
        resolve();
    });
};

const cleanupService = async () => {
    try {
        const sessionPath = path.resolve(__dirname, '../.wwebjs_auth/session');
        if (fs.existsSync(sessionPath)) {
            console.log('[WhatsApp] Cleaning up session locks...');
            const lockFiles = ['SingletonLock', 'lockfile', 'DevToolsActivePort', 'SingletonCookie', 'SingletonSocket'];
            lockFiles.forEach(file => {
                const fullPath = path.join(sessionPath, file);
                if (fs.existsSync(fullPath)) {
                    try {
                        fs.unlinkSync(fullPath);
                    } catch (e) {}
                }
            });
        }
    } catch (err) {
        console.warn('[WhatsApp] Cleanup warning:', err.message);
    }
};


/**
 * Helper to remove entire session directory for true logout
 */
const deleteSessionData = () => {
    return new Promise((resolve) => {
        const authPath = path.resolve(__dirname, '../.wwebjs_auth');
        if (fs.existsSync(authPath)) {
            console.log('[WhatsApp] Deleting persistent session data...');
            try {
                // Use force and recursive to handle locks and subdirs
                fs.rmSync(authPath, { recursive: true, force: true });
                console.log('[WhatsApp] Session data cleared.');
            } catch (err) {
                console.warn('[WhatsApp] Session deletion warning:', err.message);
            }
        }
        resolve();
    });
};

/**
 * Helper to remove session locks manually
 */
const clearSessionLocks = (sessionPath) => {
    try {
        const lockFiles = ['SingletonLock', 'lockfile', 'DevToolsActivePort', 'SingletonCookie', 'SingletonSocket'];
        lockFiles.forEach(file => {
            const fullPath = path.join(sessionPath, file);
            if (fs.existsSync(fullPath)) {
                console.log(`[WhatsApp] Removing lock file: ${file}`);
                try {
                    fs.unlinkSync(fullPath);
                } catch (e) {
                    console.warn(`[WhatsApp] Could not delete lock file ${file}: ${e.message}`);
                }
            }
        });
    } catch (err) {
        if (err.code !== 'ENOENT') {
            console.warn('[WhatsApp] Lock cleanup warning:', err.message);
        }
    }
};

/**
 * Initialize WhatsApp Client
 */
const initializeWhatsApp = async () => {
    if (isInitializing) {
        console.log('[WhatsApp] Initialization already in progress, skipping...');
        return;
    }

    isInitializing = true;
    console.log('\n[WhatsApp] Initializing client (Stable Mode)...');
    connectionStatus = 'Initializing';

    // Safety timeout: If initialization takes > 60s, reset flag
    const initTimeout = setTimeout(() => {
        if (isInitializing && connectionStatus === 'Initializing') {
            console.error('[WhatsApp] Initialization TIMEOUT - Resetting state');
            isInitializing = false;
            connectionStatus = 'Disconnected';
        }
    }, 60000);

    try {
        // --- STABLE BOOT SEQUENCE ---
        // 1. Kill potential zombie processes
        await killBrowserProcesses();
        
        // 2. Cleanup locks before starting
        await cleanupService();

        // 2. Cleanup existing client object if it exists
        if (client) {
            console.log('[WhatsApp] Cleaning up old client instance...');
            try {
                client.removeAllListeners();
                // Attempt a quick destroy, but don't hang if it fails
                await Promise.race([
                    client.destroy(),
                    new Promise(resolve => setTimeout(resolve, 2000))
                ]).catch(() => {});
            } catch (e) {}
            client = null;
        }


        const { Client, LocalAuth } = require('whatsapp-web.js');
        let puppeteerLib = require('puppeteer');
        let executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;

        // Use @sparticuz/chromium in production (Render)
        if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
            console.log('[WhatsApp] Cloud environment detected. Using @sparticuz/chromium...');
            try {
                const chromium = require('@sparticuz/chromium');
                puppeteerLib = require('puppeteer-core');
                executablePath = await chromium.executablePath();
                console.log('[WhatsApp] Chromium path resolved.');
            } catch (err) {
                console.warn('[WhatsApp] Failed to load @sparticuz/chromium, falling back to default puppeteer.');
            }
        }
        /* -------------------------------------- */

        client = new Client({
            authStrategy: new LocalAuth({
                dataPath: './.wwebjs_auth'
            }),
            webVersionCache: {
                type: 'remote',
                remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
            },
            puppeteer: {
                headless: 'new',
                handleSIGINT: false,
                executablePath: executablePath,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-extensions',
                    '--no-zygote',
                    '--disable-gpu',
                    '--single-process',
                    '--disable-software-rasterizer',
                    '--no-first-run',
                    '--disable-background-networking',
                    '--disable-default-apps',
                    ...((process.env.NODE_ENV === 'production' || process.env.RENDER) ? require('@sparticuz/chromium').args : [])
                ],
            }
        });

        console.log('[WhatsApp] Setting up event listeners...');
        client.on('qr', (qr) => {
            clearTimeout(initTimeout);
            qrString = qr;
            isInitializing = false;
            connectionStatus = 'Disconnected';
            console.log('\n🚨 ACTION REQUIRED: SCAN THE QR CODE BELOW TO ENABLE WHATSAPP');
            qrcode.generate(qr, { small: true });
        });

        client.on('ready', () => {
            clearTimeout(initTimeout);
            console.log('\n✅ [WhatsApp] SYSTEM READY.');
            isReady = true;
            isInitializing = false;
            qrString = '';
            connectionStatus = 'Ready';
        });

        client.on('authenticated', () => {
            console.log('✅ [WhatsApp] Authenticated.');
            isInitializing = false;
            connectionStatus = 'Ready';
        });

        client.on('auth_failure', (msg) => {
            clearTimeout(initTimeout);
            console.error('❌ [WhatsApp] Auth failed:', msg);
            isReady = false;
            isInitializing = false;
            connectionStatus = 'Disconnected';
        });

        client.on('disconnected', (reason) => {
            clearTimeout(initTimeout);
            console.log('❌ [WhatsApp] DISCONNECTED:', reason);
            isReady = false;
            isInitializing = false;
            qrString = '';
            connectionStatus = 'Disconnected';
            // Wait before auto-reconnect
            setTimeout(() => initializeWhatsApp(), 10000);
        });

        console.log('[WhatsApp] Attempting client initialization...');
        // Set a timeout for initialization to prevent permanent hang
        await Promise.race([
            client.initialize(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Initialization Timeout')), 45000))
        ]);
        console.log('[WhatsApp] client.initialize() call completed.');

        // Note: isInitializing will be set to false in 'ready' or 'qr' events
    } catch (err) {
        clearTimeout(initTimeout);
        console.error('❌ [WhatsApp] CRITICAL ERROR:', err.message);
        isInitializing = false;
        connectionStatus = 'Disconnected';

        // Check if it's a lock error and maybe wait longer
        const isLockError = err.message.includes('already running');
        const retryDelay = isLockError ? 60000 : 30000; // Slower retries to prevent crash loops

        console.log(`[WhatsApp] Failure detected. Next retry in ${retryDelay / 1000}s. API remains operational.`);
        setTimeout(() => initializeWhatsApp(), retryDelay);
    }
};

/**
 * Send WhatsApp Message
 */
const sendWhatsAppMessage = async (mobile, message) => {
    if (!isReady || !client) {
        return { success: false, error: 'WhatsApp not ready' };
    }

    try {
        const cleanNumber = mobile.replace(/\D/g, '');
        const chatId = cleanNumber.length === 10 ? `91${cleanNumber}@c.us` : `${cleanNumber}@c.us`;
        await client.sendMessage(chatId, message);
        return { success: true };
    } catch (err) {
        console.error(`❌ [WhatsApp] Send FAILED:`, err.message);
        return { success: false, error: err.message };
    }
};

/**
 * Force Disconnect and Relink (Generates New QR)
 * THIS NOW DELETES OLD SESSION DATA
 */
const forceRelink = async () => {
    try {
        console.log('[WhatsApp] Force Logout & Relink initiated...');
        isReady = false;
        isInitializing = false;
        qrString = '';
        connectionStatus = 'Disconnected';

        if (client) {
            client.removeAllListeners();
            await client.destroy().catch(() => { });
            client = null;
        }

        // 1. Kill browser processes
        await killBrowserProcesses();

        // 2. Wipe physical session data to ensure new QR
        await deleteSessionData();

        // 3. Re-initialize after buffer
        console.log('[WhatsApp] Re-initializing for new client...');
        setTimeout(() => initializeWhatsApp(), 3000);
        return { success: true };
    } catch (err) {
        console.error('[WhatsApp] Global Initialization Failure:', err);
        isInitializing = false;
        connectionStatus = 'Disconnected';
        return { success: false, error: err.message };
    }
};

/**
 * Deep Reset (Hard Cleanup)
 */
const hardResetWhatsApp = async () => {
    try {
        console.log('[WhatsApp] HARD RESET CALLED');
        isReady = false;
        isInitializing = false;
        qrString = '';
        connectionStatus = 'Disconnected';

        if (client) {
            client.removeAllListeners();
            await client.destroy().catch(() => { });
            client = null;
        }

        // Deep cleanup
        await killBrowserProcesses();
        await deleteSessionData();

        // Boot after 3s cleanup window
        setTimeout(() => initializeWhatsApp(), 3000);
        return { success: true, message: 'Hard reset triggered' };
    } catch (err) {
        console.error('[WhatsApp] Hard reset failed:', err);
        return { success: false, error: err.message };
    }
};

module.exports = {
    initializeWhatsApp,
    sendWhatsAppMessage,
    forceRelink,
    hardResetWhatsApp,
    getIsWhatsAppReady: () => isReady,
    getWhatsAppStatus: () => connectionStatus,
    getWhatsAppNumber: () => client?.info?.wid?.user || null,
    getWhatsAppQR: () => qrString
};
