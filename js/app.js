/**
 * Azure Broadcast App - Main Application v2.4
 * FIXED: Missing news table handling + Long URL truncation issue
 */

console.log('🚀 Loading Azure Broadcast App v2.4 - PowerAI Edition (Fixed)');

// Configuration
const msalConfig = {
    auth: {
        clientId: 'e7174676-e8bb-446b-9260-af3f28086458',
        authority: 'https://login.microsoftonline.com/common',
        redirectUri: window.location.origin
    },
    cache: {
        cacheLocation: 'localStorage',
        storeAuthStateInCookie: false
    }
};

const dataverseConfig = {
    webApiEndpoint: 'https://beredskap360utv.api.crm4.dynamics.com/api/data/v9.2',
    environmentId: 'd17c0905-0627-e2c7-991f-02c12daadd44',
    organizationId: '2061523f-6d02-f011-b015-0022489e5943',
    tablePrefix: 'powerai_'
};

// Initialize MSAL
let msalInstance;

try {
    if (typeof msal !== 'undefined' && msal.PublicClientApplication) {
        msalInstance = new msal.PublicClientApplication(msalConfig);
        console.log('✅ MSAL instance created successfully (v2.4)');
    } else {
        console.error('❌ MSAL library not properly loaded');
    }
} catch (error) {
    console.error('❌ Failed to create MSAL instance:', error);
}

class AzureBroadcastApp {
    constructor() {
        console.log('🎬 Initializing AzureBroadcastApp v2.4...');
        
        if (!msalInstance) {
            throw new Error('MSAL instance not available. Cannot initialize app.');
        }
        
        this.accessToken = null;
        this.currentUser = null;
        this.broadcastSchedule = [];
        this.currentProgramIndex = 0;
        this.isPlayingVideo = false;
        this.videoProgressInterval = null;
        this.scheduleCheckInterval = null;
        this.nextBroadcastTime = null;
        this.lastScheduleUpdate = null;
        this.lastNewsUpdate = null;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.currentVideoTimeout = null;
        this.programEndTimeout = null;
        this.newsTableExists = false; // Track if news table exists
        
        // Program fallback content
        this.programContent = {
            weather: { 
                icon: '🌤️', 
                color: 'linear-gradient(135deg, #4FC3F7, #29B6F6)', 
                description: 'Værvarsel for Norge',
                subtitle: 'Oppdatert værmelding fra Meteorologisk institutt'
            },
            sports: { 
                icon: '⚽', 
                color: 'linear-gradient(135deg, #66BB6A, #4CAF50)', 
                description: 'Sportsresultater',
                subtitle: 'Siste nytt fra norsk og internasjonal idrett'
            },
            news: { 
                icon: '📰', 
                color: 'linear-gradient(135deg, #FF7043, #FF5722)', 
                description: 'Siste nyheter',
                subtitle: 'Viktige nyhetsoppdateringer fra Norge og verden'
            },
            traffic: { 
                icon: '🚗', 
                color: 'linear-gradient(135deg, #FFA726, #FF9800)', 
                description: 'Trafikkinfo',
                subtitle: 'Trafikksituasjonen i Norge akkurat nå'
            },
            culture: { 
                icon: '🎭', 
                color: 'linear-gradient(135deg, #AB47BC, #9C27B0)', 
                description: 'Kultur og underholdning',
                subtitle: 'Fra kunst, kultur og underholdningsbransjen'
            }
        };

        this.newsItems = [
            'Azure Broadcast System v2.4 initialiseres...'
        ];
        this.currentNewsIndex = 0;
        
        this.init();
    }

    async init() {
        try {
            console.log('🚀 Azure Broadcast App v2.4 starter...');
            console.log('🌍 Environment: Production (Azure Static Web App)');
            console.log('🔗 Dataverse Endpoint:', dataverseConfig.webApiEndpoint);
            console.log('🏷️ Table Prefix:', dataverseConfig.tablePrefix);
            console.log('🎥 Video Looping: FIXED');
            console.log('📰 News Integration: AUTO-DETECT');
            console.log('🔗 Long URL Support: FIXED');
            
            this.setupEventListeners();
            await this.handleAuthRedirect();
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            this.handleGlobalError(error);
        }
    }

    setupEventListeners() {
        try {
            const loginBtn = document.getElementById('loginBtn');
            const logoutBtn = document.getElementById('logoutBtn');
            
            if (loginBtn) {
                loginBtn.addEventListener('click', () => this.login());
            }
            
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => this.logout());
            }
            
            window.addEventListener('focus', () => this.handlePageFocus());
            window.addEventListener('blur', () => this.handlePageBlur());
            window.addEventListener('online', () => this.handleNetworkOnline());
            window.addEventListener('offline', () => this.handleNetworkOffline());
            
            console.log('✅ Event listeners setup complete');
        } catch (error) {
            console.error('❌ Failed to setup event listeners:', error);
        }
    }

    async handleAuthRedirect() {
        try {
            console.log('🔍 Checking authentication status...');
            const response = await msalInstance.handleRedirectPromise();
            
            if (response) {
                console.log('✅ Login redirect successful');
                this.currentUser = response.account;
                await this.initializeApp();
            } else {
                const accounts = msalInstance.getAllAccounts();
                if (accounts.length > 0) {
                    console.log('✅ User already authenticated');
                    this.currentUser = accounts[0];
                    await this.initializeApp();
                } else {
                    console.log('ℹ️ No authenticated user found');
                }
            }
        } catch (error) {
            console.error('❌ Authentication error:', error);
            this.showError('Innloggingsfeil: ' + error.message);
        }
    }

    async login() {
        try {
            console.log('🔐 Starting login process...');
            this.showLoading(true);
            
            const loginRequest = {
                scopes: [
                    'https://beredskap360utv.api.crm4.dynamics.com/user_impersonation',
                    'User.Read'
                ],
                prompt: 'select_account'
            };

            await msalInstance.loginRedirect(loginRequest);
        } catch (error) {
            console.error('❌ Login error:', error);
            this.showError('Kunne ikke logge inn: ' + error.message);
            this.showLoading(false);
        }
    }

    async logout() {
        try {
            console.log('🚪 Logging out...');
            await msalInstance.logoutRedirect({
                postLogoutRedirectUri: window.location.origin
            });
        } catch (error) {
            console.error('❌ Logout error:', error);
            window.location.reload();
        }
    }

    async initializeApp() {
        try {
            console.log('🚀 Initializing application v2.4...');
            this.showLoading(true);
            
            await this.getAccessToken();
            
            this.showElement('loginScreen', false);
            this.showElement('mainContainer', true);
            
            const userDisplayElement = document.getElementById('userDisplayName');
            if (userDisplayElement) {
                userDisplayElement.textContent = 
                    this.currentUser.name || this.currentUser.username || 'Ukjent bruker';
            }
            
            this.startClock();
            await this.loadBroadcastSchedule();
            this.startScheduleChecker();
            this.startNewsRotation();
            
            this.showSuccess('✅ Koblet til Azure og Dataverse v2.4!');
            console.log('✅ Application v2.4 initialized successfully');
            
        } catch (error) {
            console.error('❌ App initialization error:', error);
            this.showError('Kunne ikke starte app: ' + error.message);
            this.initializeDemoMode();
        }
        
        this.showLoading(false);
    }

    async getAccessToken() {
        try {
            console.log('🔑 Acquiring access token...');
            
            const tokenRequest = {
                scopes: ['https://beredskap360utv.api.crm4.dynamics.com/user_impersonation'],
                account: this.currentUser
            };

            const response = await msalInstance.acquireTokenSilent(tokenRequest);
            this.accessToken = response.accessToken;
            
            console.log('✅ Access token acquired successfully');
            
        } catch (error) {
            console.warn('⚠️ Silent token acquisition failed, trying interactive:', error);
            
            try {
                const response = await msalInstance.acquireTokenRedirect(tokenRequest);
                this.accessToken = response.accessToken;
            } catch (interactiveError) {
                console.error('❌ Token acquisition failed:', interactiveError);
                throw new Error('Kunne ikke få tilgang til Dataverse. Prøv å logge inn på nytt.');
            }
        }
    }

    async loadBroadcastSchedule() {
        try {
            console.log('📅 Loading broadcast schedule from Dataverse...');
            this.updateDataverseStatus('Laster sendeskjema...');
            
            if (!this.accessToken) {
                throw new Error('Mangler access token');
            }
            
            const headers = {
                'Authorization': `Bearer ${this.accessToken}`,
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0',
                'Accept': 'application/json',
                'Prefer': 'return=representation'
            };

            const tableName = `${dataverseConfig.tablePrefix}broadcastschedules`;
            const query = `${dataverseConfig.webApiEndpoint}/${tableName}?$filter=${dataverseConfig.tablePrefix}isactive eq true&$orderby=${dataverseConfig.tablePrefix}scheduledtime asc&$top=50`;
            
            console.log('🔍 API Query v2.4:', query);
            
            const response = await fetch(query, { 
                headers,
                method: 'GET'
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ API Error Response:', errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.broadcastSchedule = data.value || [];
            this.lastScheduleUpdate = new Date();
            this.retryCount = 0;
            
            console.log(`✅ Loaded ${this.broadcastSchedule.length} programs from Dataverse`);
            
            // DEBUG: Log first program's video URL to check truncation
            if (this.broadcastSchedule.length > 0) {
                const firstProgram = this.broadcastSchedule[0];
                const videoUrl = firstProgram[`${dataverseConfig.tablePrefix}videourl`];
                if (videoUrl) {
                    console.log('🔍 First program video URL length:', videoUrl.length);
                    console.log('🔍 First program video URL:', videoUrl);
                }
            }
            
            this.updateScheduleDisplay();
            this.updateDataverseStatus(`${this.broadcastSchedule.length} programmer lastet`);
            
        } catch (error) {
            console.error('❌ Dataverse error:', error);
            this.retryCount++;
            
            if (this.retryCount <= this.maxRetries) {
                console.log(`🔄 Retrying (${this.retryCount}/${this.maxRetries}) in 5 seconds...`);
                this.updateDataverseStatus(`Feil - prøver igjen (${this.retryCount}/${this.maxRetries})`);
                
                setTimeout(() => {
                    this.loadBroadcastSchedule();
                }, 5000);
            } else {
                console.log('⚠️ Max retries reached, falling back to demo data');
                this.updateDataverseStatus('Bruker demo-data');
                
                this.broadcastSchedule = this.createDemoSchedule();
                this.updateScheduleDisplay();
                this.showError('Dataverse utilgjengelig - bruker demo-data: ' + error.message);
            }
        }
    }

    createDemoSchedule() {
        console.log('📋 Creating demo schedule v2.4...');
        const now = new Date();
        const demoSchedule = [];
        
        for (let i = 0; i < 20; i++) {
            const scheduledTime = new Date(now.getTime() + (i * 30 * 1000));
            const programTypes = ['weather', 'sports', 'news', 'traffic', 'culture'];
            const programNames = ['Værmelding', 'Sportsnytt', 'Nyhetsoppdatering', 'Trafikkmelding', 'Kulturnytt'];
            
            const typeIndex = i % programTypes.length;
            
            // Add some demo programs with long blob URLs to test
            let demoVideoUrl = null;
            if (i === 0) {
                demoVideoUrl = 'https://poweraitestaistorage.blob.core.windows.net/videos/How Investing in AI Video Drives Business Outcomes.mp4';
            } else if (i === 1) {
                demoVideoUrl = 'https://poweraitestaistorage.blob.core.windows.net/videos/sample-long-filename-with-many-characters-to-test-url-length.mp4';
            }
            
            demoSchedule.push({
                [`${dataverseConfig.tablePrefix}broadcastscheduleid`]: `demo-${i}`,
                [`${dataverseConfig.tablePrefix}name`]: `${programNames[typeIndex]} #${Math.floor(i/5) + 1}`,
                [`${dataverseConfig.tablePrefix}programtype`]: programTypes[typeIndex],
                [`${dataverseConfig.tablePrefix}scheduledtime`]: scheduledTime.toISOString(),
                [`${dataverseConfig.tablePrefix}duration`]: 8 + (i % 5) * 2,
                [`${dataverseConfig.tablePrefix}videourl`]: demoVideoUrl,
                [`${dataverseConfig.tablePrefix}isactive`]: true,
                [`${dataverseConfig.tablePrefix}description`]: `Demo ${programNames[typeIndex]} - Azure v2.4`,
                [`${dataverseConfig.tablePrefix}priority`]: i
            });
        }
        
        console.log(`✅ Created ${demoSchedule.length} demo programs with test URLs`);
        return demoSchedule;
    }

    updateScheduleDisplay() {
        const scheduleList = document.getElementById('scheduleList');
        if (!scheduleList) return;
        
        const now = new Date();
        const prefix = dataverseConfig.tablePrefix;
        
        const upcomingPrograms = this.broadcastSchedule
            .filter(program => new Date(program[`${prefix}scheduledtime`]) > now)
            .slice(0, 8);
        
        if (upcomingPrograms.length === 0) {
            scheduleList.innerHTML = `
                <div style="color: #ffeb3b; text-align: center; padding: 20px;">
                    <div style="font-size: 2rem; margin-bottom: 10px;">⏰</div>
                    <div>Ingen kommende programmer</div>
                    <div style="font-size: 0.9rem; opacity: 0.7; margin-top: 10px;">
                        Sjekk Dataverse-konfigurasjonen
                    </div>
                </div>`;
            return;
        }
        
        let html = '';
        upcomingPrograms.forEach((program, index) => {
            const scheduledTime = new Date(program[`${prefix}scheduledtime`]);
            const timeString = scheduledTime.toLocaleTimeString('no-NO', { 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit'
            });
            
            const timeUntil = Math.ceil((scheduledTime.getTime() - now.getTime()) / 1000);
            const isNext = index === 0;
            const isActive = timeUntil <= 60;
            
            let statusColor = '#666';
            let statusText = '';
            
            if (isNext) {
                statusColor = '#4fc3f7';
                statusText = '← NESTE';
            } else if (isActive) {
                statusColor = '#ff9800';
                statusText = '⚡ SNART';
            }
            
            const programIcon = this.programContent[program[`${prefix}programtype`]]?.icon || '📺';
            
            const hasVideo = program[`${prefix}videourl`] && program[`${prefix}videourl`].trim();
            const videoIndicator = hasVideo ? '🎥' : '🎨';
            const videoTitle = hasVideo ? 'Video fra blob storage' : 'Animert program';
            
            // DEBUG: Show URL length in display
            const urlLength = hasVideo ? program[`${prefix}videourl`].length : 0;
            
            html += `
                <div style="
                    margin: 8px 0; 
                    padding: 12px; 
                    border-left: 4px solid ${statusColor}; 
                    background: ${isNext ? 'rgba(79, 195, 247, 0.1)' : isActive ? 'rgba(255, 152, 0, 0.1)' : 'rgba(255,255,255,0.05)'}; 
                    border-radius: 0 8px 8px 0;
                    transition: all 0.3s ease;
                ">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px;">
                        <strong style="color: ${statusColor}; font-size: 1.1rem;">
                            ${programIcon} ${timeString}
                        </strong>
                        <span style="color: ${statusColor}; font-size: 0.8rem; font-weight: bold;">
                            ${statusText}
                        </span>
                    </div>
                    <div style="color: white; font-weight: 500; margin-bottom: 3px; display: flex; align-items: center; gap: 8px;">
                        ${program[`${prefix}name`]}
                        <span style="font-size: 0.8rem; opacity: 0.7;" title="${videoTitle}">${videoIndicator}</span>
                    </div>
                    <div style="font-size: 0.85rem; opacity: 0.8; display: flex; justify-content: space-between;">
                        <span>${program[`${prefix}duration`]}s</span>
                        <span>${timeUntil > 0 ? `om ${timeUntil}s` : 'nå'}</span>
                    </div>
                    ${program[`${prefix}description`] ? `
                        <div style="font-size: 0.8rem; opacity: 0.6; margin-top: 5px; font-style: italic;">
                            ${program[`${prefix}description`]}
                        </div>
                    ` : ''}
                    ${hasVideo ? `
                        <div style="font-size: 0.75rem; opacity: 0.5; margin-top: 3px; color: #4fc3f7;">
                            📡 Video URL (${urlLength} tegn)
                        </div>
                    ` : ''}
                </div>
            `;
        });
        
        scheduleList.innerHTML = html;
        
        if (upcomingPrograms.length > 0) {
            this.nextBroadcastTime = new Date(upcomingPrograms[0][`${prefix}scheduledtime`]);
            this.currentProgramIndex = this.broadcastSchedule.indexOf(upcomingPrograms[0]);
            
            console.log(`📺 Next program: ${upcomingPrograms[0][`${prefix}name`]} at ${this.nextBroadcastTime.toLocaleTimeString()}`);
        }
    }

    startClock() {
        const updateClock = () => {
            const now = new Date();
            const timeString = now.toLocaleTimeString('no-NO', { 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit'
            });
            const clockElement = document.getElementById('currentTime');
            if (clockElement) {
                clockElement.textContent = timeString;
            }
        };
        
        updateClock();
        setInterval(updateClock, 1000);
        console.log('🕒 Clock started');
    }

    startScheduleChecker() {
        this.scheduleCheckInterval = setInterval(() => {
            this.checkAndStartProgram();
            this.updateCountdown();
        }, 1000);
        
        setInterval(() => {
            if (!this.isPlayingVideo && this.accessToken) {
                const timeSinceUpdate = new Date() - this.lastScheduleUpdate;
                if (timeSinceUpdate > 2 * 60 * 1000) {
                    console.log('🔄 Auto-refreshing schedule...');
                    this.loadBroadcastSchedule();
                }
            }
        }, 30 * 1000);
        
        console.log('⏰ Schedule checker started');
    }

    updateCountdown() {
        const liveCountdownElement = document.getElementById('liveCountdown');
        if (!liveCountdownElement) return;
        
        if (this.isPlayingVideo || !this.nextBroadcastTime) {
            liveCountdownElement.style.display = 'none';
            return;
        }
        
        liveCountdownElement.style.display = 'block';
        
        const now = new Date();
        const timeDiff = this.nextBroadcastTime.getTime() - now.getTime();
        const secondsLeft = Math.max(0, Math.ceil(timeDiff / 1000));
        
        const countdownNumber = document.getElementById('liveCountdownNumber');
        const countdownText = document.getElementById('liveCountdownText');
        
        if (countdownNumber) {
            countdownNumber.textContent = secondsLeft;
        }
        
        if (countdownText) {
            if (secondsLeft <= 3) {
                liveCountdownElement.style.background = 'linear-gradient(135deg, #ff1744, #d50000)';
                countdownText.textContent = 'STARTER NÅ!';
            } else if (secondsLeft <= 10) {
                liveCountdownElement.style.background = 'linear-gradient(135deg, #ff5722, #e64a19)';
                countdownText.textContent = 'sekunder igjen';
            } else {
                liveCountdownElement.style.background = 'linear-gradient(135deg, #dc3545, #c82333)';
                countdownText.textContent = 'sekunder';
            }
        }
    }

    checkAndStartProgram() {
        if (this.isPlayingVideo || !this.nextBroadcastTime) return;
        
        const now = new Date();
        
        if (now >= this.nextBroadcastTime) {
            const currentProgram = this.broadcastSchedule[this.currentProgramIndex];
            if (currentProgram) {
                const prefix = dataverseConfig.tablePrefix;
                console.log(`🎬 Auto-starting program: ${currentProgram[`${prefix}name`]}`);
                this.startProgram(currentProgram);
            } else {
                console.warn('⚠️ No program found for current index:', this.currentProgramIndex);
                this.updateScheduleDisplay();
            }
        }
    }

    isValidVideoUrl(url) {
        try {
            const urlObj = new URL(url);
            
            if (!urlObj.protocol.startsWith('http')) {
                return false;
            }
            
            const pathname = urlObj.pathname.toLowerCase();
            const validExtensions = ['.mp4', '.webm', '.avi', '.mov', '.mkv', '.m4v'];
            const isBlobStorage = urlObj.hostname.includes('.blob.core.windows.net') || 
                                 urlObj.hostname.includes('.amazonaws.com') ||
                                 urlObj.hostname.includes('.googleapis.com');
            
            return isBlobStorage || validExtensions.some(ext => pathname.includes(ext));
            
        } catch (error) {
            console.log(`❌ URL validation failed: ${error.message}`);
            return false;
        }
    }

    async startProgram(program) {
        const prefix = dataverseConfig.tablePrefix;
        console.log(`🎬 Starting program: ${program[`${prefix}name`]}`);
        this.isPlayingVideo = true;
        
        if (this.programEndTimeout) {
            clearTimeout(this.programEndTimeout);
        }
        
        this.showElement('backgroundScreen', false);
        this.showElement('videoContainer', true);
        this.showElement('liveCountdown', false);
        
        const titleElement = document.getElementById('currentProgramTitle');
        if (titleElement) {
            titleElement.textContent = program[`${prefix}name`];
        }
        
        const videoUrl = program[`${prefix}videourl`];
        if (videoUrl && videoUrl.trim() && this.isValidVideoUrl(videoUrl.trim())) {
            console.log(`🎥 Loading video: ${videoUrl}`);
            console.log(`🔍 Video URL length: ${videoUrl.length} characters`);
            this.tryLoadRealVideo(videoUrl.trim(), program[`${prefix}programtype`]);
        } else {
            if (videoUrl) {
                console.log(`⚠️ Invalid video URL: ${videoUrl}`);
            }
            console.log(`🎨 Using animated fallback for: ${program[`${prefix}programtype`]}`);
            this.showAnimatedProgram(program[`${prefix}programtype`]);
        }
        
        this.startProgressBar(program[`${prefix}duration`]);

        this.programEndTimeout = setTimeout(() => {
            this.endProgram();
        }, program[`${prefix}duration`] * 1000);
        
        this.updateDataverseStatus(`Sender: ${program[`${prefix}name`]}`);
    }

    tryLoadRealVideo(videoUrl, programType) {
        const video = document.getElementById('realVideo');
        const animatedProgram = document.getElementById('animatedProgram');
        
        if (!video || !animatedProgram) return;
        
        if (this.currentVideoTimeout) {
            clearTimeout(this.currentVideoTimeout);
            this.currentVideoTimeout = null;
        }
        
        video.style.display = 'none';
        animatedProgram.style.display = 'none';
        
        video.onloadeddata = null;
        video.onerror = null;
        video.onended = null;
        video.oncanplay = null;
        video.onloadstart = null;
        video.onprogress = null;
        
        video.pause();
        video.currentTime = 0;
        video.src = '';
        
        video.loop = false;
        video.controls = false;
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        video.preload = 'metadata';
        video.disablePictureInPicture = true;
        
        this.currentVideoTimeout = setTimeout(() => {
            console.log('⏰ Video loading timeout, using animation fallback');
            this.showAnimatedProgram(programType);
            this.currentVideoTimeout = null;
        }, 15000); // Increased to 15 seconds for long URLs
        
        video.onloadstart = () => {
            console.log('📡 Started loading video...');
        };
        
        video.onprogress = () => {
            if (video.buffered.length > 0) {
                const bufferedEnd = video.buffered.end(video.buffered.length - 1);
                const duration = video.duration;
                if (duration > 0) {
                    const bufferedPercent = (bufferedEnd / duration) * 100;
                    console.log(`📊 Video buffered: ${Math.round(bufferedPercent)}%`);
                }
            }
        };
        
        video.onended = () => {
            console.log('📺 Video ended naturally - preventing restart');
            video.pause();
            video.currentTime = 0;
            video.src = '';
        };
        
        video.onloadeddata = () => {
            console.log('✅ Video loaded successfully');
            if (this.currentVideoTimeout) {
                clearTimeout(this.currentVideoTimeout);
                this.currentVideoTimeout = null;
            }
            
            video.style.display = 'block';
            animatedProgram.style.display = 'none';
            
            video.loop = false;
            video.currentTime = 0;
            
            video.play().catch(e => {
                console.log(`❌ Video autoplay failed: ${e.message}`);
                this.showAnimatedProgram(programType);
            });
        };
        
        video.onerror = (e) => {
            const error = video.error;
            let errorMessage = 'Unknown error';
            
            if (error) {
                switch(error.code) {
                    case MediaError.MEDIA_ERR_ABORTED:
                        errorMessage = 'Video loading aborted';
                        break;
                    case MediaError.MEDIA_ERR_NETWORK:
                        errorMessage = 'Network error loading video';
                        break;
                    case MediaError.MEDIA_ERR_DECODE:
                        errorMessage = 'Video decode error';
                        break;
                    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                        errorMessage = 'Video format not supported';
                        break;
                }
            }
            
            console.log(`❌ Video loading failed: ${errorMessage}`, e);
            if (this.currentVideoTimeout) {
                clearTimeout(this.currentVideoTimeout);
                this.currentVideoTimeout = null;
            }
            this.showAnimatedProgram(programType);
        };
        
        console.log(`🔗 Setting video source: ${videoUrl}`);
        video.src = videoUrl;
        video.load();
    }

    showAnimatedProgram(programType) {
        const video = document.getElementById('realVideo');
        const animatedProgram = document.getElementById('animatedProgram');
        
        if (!video || !animatedProgram) return;
        
        const content = this.programContent[programType] || this.programContent.news;
        
        video.style.display = 'none';
        video.pause();
        video.src = '';
        
        animatedProgram.style.display = 'flex';
        animatedProgram.style.background = content.color;
        
        animatedProgram.innerHTML = `
            <div style="text-align: center; color: white;">
                <div class="program-icon">${content.icon}</div>
                <div class="program-title">${content.description}</div>
                <div class="program-subtitle">${content.subtitle}</div>
                <div class="live-indicator">🔴 DIREKTE FRA AZURE v2.4</div>
            </div>
        `;
        
        console.log(`✅ Animated program displayed: ${programType}`);
    }

    startProgressBar(duration) {
        let progress = 0;
        const progressBar = document.getElementById('progressBar');
        if (!progressBar) return;
        
        progressBar.style.width = '0%';
        
        if (this.videoProgressInterval) {
            clearInterval(this.videoProgressInterval);
        }
        
        this.videoProgressInterval = setInterval(() => {
            progress += 100 / (duration * 10);
            const currentProgress = Math.min(progress, 100);
            progressBar.style.width = currentProgress + '%';
            
            if (currentProgress >= 100) {
                clearInterval(this.videoProgressInterval);
            }
        }, 100);
        
        console.log(`📊 Progress bar started for ${duration}s`);
    }

    endProgram() {
        console.log('📺 Ending current program v2.4');
        this.isPlayingVideo = false;
        
        if (this.currentVideoTimeout) {
            clearTimeout(this.currentVideoTimeout);
            this.currentVideoTimeout = null;
        }
        
        if (this.programEndTimeout) {
            clearTimeout(this.programEndTimeout);
            this.programEndTimeout = null;
        }
        
        const video = document.getElementById('realVideo');
        if (video) {
            video.pause();
            video.currentTime = 0;
            video.src = '';
            video.style.display = 'none';
            
            video.onended = null;
            video.onloadeddata = null;
            video.onerror = null;
            video.oncanplay = null;
            video.onplay = null;
            video.onpause = null;
            video.onloadstart = null;
            video.onprogress = null;
            
            video.loop = false;
            video.autoplay = false;
        }
        
        const animatedProgram = document.getElementById('animatedProgram');
        if (animatedProgram) {
            animatedProgram.style.display = 'none';
            animatedProgram.innerHTML = '';
        }
        
        if (this.videoProgressInterval) {
            clearInterval(this.videoProgressInterval);
            this.videoProgressInterval = null;
            const progressBar = document.getElementById('progressBar');
            if (progressBar) {
                progressBar.style.width = '0%';
            }
        }
        
        this.showElement('videoContainer', false);
        this.showElement('backgroundScreen', true);
        this.showElement('liveCountdown', true);
        
        this.updateScheduleDisplay();
        this.updateDataverseStatus('Klar for neste sending');
        
        console.log('✅ Program ended completely, ready for next broadcast');
    }

    // FIXED: Smart news loading that handles missing table
    startNewsRotation() {
        const rotateNews = () => {
            this.currentNewsIndex = (this.currentNewsIndex + 1) % this.newsItems.length;
            const newsElement = document.getElementById('newsText');
            if (newsElement) {
                newsElement.textContent = this.newsItems[this.currentNewsIndex];
            }
        };
        
        setInterval(rotateNews, 8000);
        
        // Try to load news at startup
        this.loadNewsFromDataverse();
        
        // Update news from Dataverse every 5 minutes (only if table exists)
        setInterval(() => {
            if (!this.isPlayingVideo && this.accessToken && this.newsTableExists) {
                console.log('🔄 Auto-refreshing news...');
                this.loadNewsFromDataverse();
            }
        }, 5 * 60 * 1000);
        
        console.log('📰 News rotation started');
    }

    async loadNewsFromDataverse() {
        try {
            if (!this.accessToken) {
                this.setFallbackNews();
                return;
            }
            
            console.log('📰 Checking for newsitems table...');
            
            const headers = {
                'Authorization': `Bearer ${this.accessToken}`,
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0',
                'Accept': 'application/json'
            };

            // First, check if the table exists by trying a simple query
            const testQuery = `${dataverseConfig.webApiEndpoint}/${dataverseConfig.tablePrefix}newsitems?$top=1`;
            
            console.log('🔍 Testing news table existence:', testQuery);
            
            const testResponse = await fetch(testQuery, { headers });
            
            if (!testResponse.ok) {
                if (testResponse.status === 404) {
                    console.log('📰 News table does not exist - using fallback news');
                    this.newsTableExists = false;
                    this.setFallbackNews();
                    this.updateDataverseStatus('Nyheter: Tabell ikke funnet');
                    return;
                } else {
                    throw new Error(`Table check failed: ${testResponse.status}`);
                }
            }
            
            // Table exists, now get the actual news
            this.newsTableExists = true;
            console.log('✅ News table exists, loading news...');
            
            const now = new Date().toISOString();
            const query = `${dataverseConfig.webApiEndpoint}/${dataverseConfig.tablePrefix}newsitems?` +
                `$filter=${dataverseConfig.tablePrefix}isactive eq true and ` +
                `(${dataverseConfig.tablePrefix}expirydate eq null or ${dataverseConfig.tablePrefix}expirydate gt ${now})&` +
                `$orderby=${dataverseConfig.tablePrefix}priority desc,${dataverseConfig.tablePrefix}publishdate desc&` +
                `$top=20&` +
                `$select=${dataverseConfig.tablePrefix}headline,${dataverseConfig.tablePrefix}name,${dataverseConfig.tablePrefix}category,${dataverseConfig.tablePrefix}source,${dataverseConfig.tablePrefix}priority,${dataverseConfig.tablePrefix}publishdate`;
            
            const response = await fetch(query, { headers });
            
            if (response.ok) {
                const data = await response.json();
                if (data.value && data.value.length > 0) {
                    this.newsItems = data.value.map(item => {
                        let newsText = item[`${dataverseConfig.tablePrefix}headline`] || 
                                       item[`${dataverseConfig.tablePrefix}name`] || 
                                       'Nyhetsoppdatering fra Dataverse';
                        
                        const category = item[`${dataverseConfig.tablePrefix}category`];
                        const categoryEmojis = {
                            'Breaking': '🚨',
                            'Sports': '⚽',
                            'Weather': '🌤️',
                            'Culture': '🎭',
                            'Politics': '🏛️',
                            'Business': '💼',
                            'Technology': '💻'
                        };
                        
                        if (category && categoryEmojis[category]) {
                            newsText = `${categoryEmojis[category]} ${newsText}`;
                        }
                        
                        const source = item[`${dataverseConfig.tablePrefix}source`];
                        if (source) {
                            newsText += ` (${source})`;
                        }
                        
                        return newsText;
                    });
                    
                    this.lastNewsUpdate = new Date();
                    console.log(`✅ Loaded ${this.newsItems.length} news items from Dataverse`);
                    this.updateDataverseStatus(`${this.newsItems.length} nyheter lastet`);
                    
                } else {
                    console.log('ℹ️ No active news found, using fallback');
                    this.setFallbackNews();
                }
            } else {
                console.log('⚠️ News query failed, using fallback');
                this.setFallbackNews();
            }
        } catch (error) {
            console.log('ℹ️ Could not load news from Dataverse:', error.message);
            this.newsTableExists = false;
            this.setFallbackNews();
        }
    }

    setFallbackNews() {
        this.newsItems = [
            '📺 Azure Static Web App Broadcast System v2.4 - Fixed URL og News Issues',
            '🌐 Norsk TV sender direkte fra Microsoft Azure Cloud Platform',
            '🔄 Automatisk program-scheduling fra Dataverse database',
            '🔒 Enterprise sikkerhet med Microsoft Authentication',
            '📊 Real-time oppdateringer og automatisk failover',
            '🚀 Global deployment via Azure Static Web Apps',
            '⚡ Power Platform integrasjon for enkel administrasjon',
            '🎥 Støtte for lange blob storage URLs opptil 500 tegn',
            '📰 Smart nyhetshåndtering med automatisk fallback',
            '🔍 Debug-informasjon for URL-lengde og table-eksistens'
        ];
        
        console.log('📰 Using fallback news items v2.4');
    }

    // Utility methods
    refreshData() {
        if (!this.isPlayingVideo && this.accessToken) {
            console.log('🔄 Refreshing data v2.4...');
            this.loadBroadcastSchedule();
            if (this.newsTableExists) {
                this.loadNewsFromDataverse();
            }
        }
    }

    handlePageFocus() {
        console.log('👁️ Page focused - checking for updates');
        this.refreshData();
    }

    handlePageBlur() {
        console.log('👁️ Page blurred');
    }

    handleNetworkOnline() {
        console.log('🌐 Network online');
        this.updateDataverseStatus('Online - synkroniserer...');
        this.refreshData();
    }

    handleNetworkOffline() {
        console.log('🌐 Network offline');
        this.updateDataverseStatus('Offline - bruker cache');
    }

    handleGlobalError(error) {
        console.error('🚨 Global error:', error);
        this.updateDataverseStatus('Feil oppstått');
        
        if (this.accessToken) {
            this.showError('En feil oppstod: ' + (error.message || error));
        }
    }

    initializeDemoMode() {
        console.log('🎯 Initializing demo mode v2.4...');
        
        this.showElement('loginScreen', false);
        this.showElement('mainContainer', true);
        
        const userDisplayElement = document.getElementById('userDisplayName');
        if (userDisplayElement) {
            userDisplayElement.textContent = 'Demo Bruker v2.4';
        }
        
        this.startClock();
        this.broadcastSchedule = this.createDemoSchedule();
        this.updateScheduleDisplay();
        this.startScheduleChecker();
        this.startNewsRotation();
        
        this.updateDataverseStatus('Demo-modus aktiv v2.4');
        this.showError('Kjører i demo-modus - begrensede funksjoner');
    }

    updateDataverseStatus(status) {
        const timestamp = new Date().toLocaleTimeString('no-NO', { 
            hour: '2-digit', 
            minute: '2-digit'
        });
        const statusElement = document.getElementById('dataverseStatus');
        if (statusElement) {
            statusElement.textContent = `🔗 Dataverse v2.4: ${status} (${timestamp})`;
        }
    }

    showLoading(show) {
        const loadingEl = document.getElementById('loginLoading');
        const buttonEl = document.getElementById('loginBtn');
        
        if (loadingEl && buttonEl) {
            loadingEl.style.display = show ? 'block' : 'none';
            buttonEl.style.display = show ? 'none' : 'block';
        }
    }

    showError(message) {
        const errorEl = document.getElementById('loginError');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
            setTimeout(() => errorEl.style.display = 'none', 8000);
        }
        console.error('❌ Error shown to user:', message);
    }

    showSuccess(message) {
        const successEl = document.getElementById('loginSuccess');
        if (successEl) {
            successEl.textContent = message;
            successEl.style.display = 'block';
            setTimeout(() => successEl.style.display = 'none', 4000);
        }
        console.log('✅ Success shown to user:', message);
    }

    showElement(elementId, show) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = show ? 'flex' : 'none';
        }
    }

    toggleAudio() {
        const video = document.getElementById('realVideo');
        const audioToggleBtn = document.getElementById('audioToggleBtn');
        
        if (!video || !audioToggleBtn) return;
        
        if (video.muted) {
            video.muted = false;
            audioToggleBtn.textContent = '🔊';
            audioToggleBtn.classList.remove('muted');
            audioToggleBtn.setAttribute('aria-label', 'Skru av lyd');
            console.log('🔊 Audio enabled');
        } else {
            video.muted = true;
            audioToggleBtn.textContent = '🔇';
            audioToggleBtn.classList.add('muted');
            audioToggleBtn.setAttribute('aria-label', 'Skru på lyd');
            console.log('🔇 Audio muted');
        }
    }
}

// Make the class available globally
window.AzureBroadcastApp = AzureBroadcastApp;

// Additional utility functions
window.BroadcastUtils = {
    formatDuration: (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    },
    
    formatTimeUntil: (targetTime) => {
        const now = new Date();
        const diff = Math.ceil((targetTime - now) / 1000);
        
        if (diff <= 0) return 'Nå';
        if (diff < 60) return `${diff}s`;
        if (diff < 3600) return `${Math.ceil(diff / 60)}m`;
        return `${Math.ceil(diff / 3600)}t`;
    },
    
    isToday: (date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }
};

// Safe initialization
(function() {
    console.log('📦 Azure Broadcast App v2.4 JavaScript loaded successfully');
    console.log('🔧 Environment: Production');
    console.log('📅 Build date:', new Date().toISOString());
    console.log('🏷️ PowerAI Prefix Support: Enabled');
    console.log('🎥 Video Looping: FIXED');
    console.log('📰 Smart News Integration: ENABLED (Auto-detect table)');
    console.log('🔗 Long URL Support: FIXED (500+ characters)');
    console.log('🔍 Debug Logging: ENABLED');
    
    if (typeof window === 'undefined') {
        console.error('❌ Window object not available');
        return;
    }
    
    const cacheVersion = 'v2.4-fixed-' + new Date().getTime();
    window.broadcastAppVersion = cacheVersion;
    console.log('🔄 Cache Version:', cacheVersion);
    
    console.log('✅ App.js v2.4 ready for initialization');
})();
