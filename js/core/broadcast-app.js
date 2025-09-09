import { startClock } from '../modules/clock.js';
import { startNewsRotation, updateNewsItems } from '../modules/news.js';
import { wireVideoEvents, createVideoHandlers } from '../modules/video.js';
// core/broadcast-app.js
class AzureBroadcastApp {
    constructor(options = {}) {
        this.msalInstance = options.msalInstance || this.msalInstance || null;
        console.log('🎬 Initializing AzureBroadcastApp v2.5 - NO LOOP + AUDIO...');
        
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
        this.newsTableExists = false;
        this.programEndedManually = false; // NEW: Track manual program end
        
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

        this.newsItems = ['Azure Broadcast System v2.5 initialiseres...'];
        this.currentNewsIndex = 0;
        
        this.init();
    }

    async init() {
        try {
            console.log('🚀 Azure Broadcast App v2.5 starter...');
            console.log('🎥 Anti-Loop: AGGRESSIVE MODE');
            console.log('🔊 Audio: ENABLED');
            
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
            console.log('🚀 Initializing application v2.5...');
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
            
            this.showSuccess('✅ Koblet til Azure og Dataverse v2.5!');
            console.log('✅ Application v2.5 initialized successfully');
            
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
        console.log('📋 Creating demo schedule v2.5...');
        const now = new Date();
        const demoSchedule = [];
        
        for (let i = 0; i < 20; i++) {
            const scheduledTime = new Date(now.getTime() + (i * 30 * 1000));
            const programTypes = ['weather', 'sports', 'news', 'traffic', 'culture'];
            const programNames = ['Værmelding', 'Sportsnytt', 'Nyhetsoppdatering', 'Trafikkmelding', 'Kulturnytt'];
            
            const typeIndex = i % programTypes.length;
            
            let demoVideoUrl = null;
            if (i === 0) {
                demoVideoUrl = 'https://poweraitestaistorage.blob.core.windows.net/videos/How Investing in AI Video Drives Business Outcomes.mp4';
            }
            
            demoSchedule.push({
                [`${dataverseConfig.tablePrefix}broadcastscheduleid`]: `demo-${i}`,
                [`${dataverseConfig.tablePrefix}name`]: `${programNames[typeIndex]} #${Math.floor(i/5) + 1}`,
                [`${dataverseConfig.tablePrefix}programtype`]: programTypes[typeIndex],
                [`${dataverseConfig.tablePrefix}scheduledtime`]: scheduledTime.toISOString(),
                [`${dataverseConfig.tablePrefix}duration`]: 15 + (i % 3) * 5, // Longer durations for testing
                [`${dataverseConfig.tablePrefix}videourl`]: demoVideoUrl,
                [`${dataverseConfig.tablePrefix}isactive`]: true,
                [`${dataverseConfig.tablePrefix}description`]: `Demo ${programNames[typeIndex]} - v2.5`,
                [`${dataverseConfig.tablePrefix}priority`]: i
            });
        }
        
        console.log(`✅ Created ${demoSchedule.length} demo programs`);
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
            const videoIndicator = hasVideo ? '🎥🔊' : '🎨'; // Added sound icon for videos
            
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
                        <span style="font-size: 0.8rem; opacity: 0.7;">${videoIndicator}</span>
                    </div>
                    <div style="font-size: 0.85rem; opacity: 0.8; display: flex; justify-content: space-between;">
                        <span>${program[`${prefix}duration`]}s</span>
                        <span>${timeUntil > 0 ? `om ${timeUntil}s` : 'nå'}</span>
                    </div>
                </div>
            `;
        });
        
        scheduleList.innerHTML = html;
        
        if (upcomingPrograms.length > 0) {
            this.nextBroadcastTime = new Date(upcomingPrograms[0][`${prefix}scheduledtime`]);
            this.currentProgramIndex = this.broadcastSchedule.indexOf(upcomingPrograms[0]);
        }
    }

    startClock() {

        try {
            // Delegate to module
            import('../modules/clock.js').then(m => {
                m.startClock();
                console.log('🕒 Clock started (module)');
            }).catch(e => console.warn('Clock module failed', e));
        } catch (e) {
            console.warn('Clock module init failed', e);
        }

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
        
        // CRITICAL: Set flags immediately
        this.isPlayingVideo = true;
        this.programEndedManually = false; // Reset manual end flag
        
        // Clear any existing timeouts
        if (this.programEndTimeout) {
            clearTimeout(this.programEndTimeout);
            this.programEndTimeout = null;
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
            console.log(`🎥 Loading video with audio: ${videoUrl}`);
            this.tryLoadRealVideo(videoUrl.trim(), program[`${prefix}programtype`]);
        } else {
            console.log(`🎨 Using animated fallback for: ${program[`${prefix}programtype`]}`);
            this.showAnimatedProgram(program[`${prefix}programtype`]);
        }
        
        this.startProgressBar(program[`${prefix}duration`]);

        // Set program end timeout - THIS IS THE MASTER TIMER
        this.programEndTimeout = setTimeout(() => {
            console.log('⏰ Program duration reached - ending program');
            this.endProgram();
        }, program[`${prefix}duration`] * 1000);
        
        this.updateDataverseStatus(`Sender: ${program[`${prefix}name`]}`);
    }

    // AGGRESSIVE ANTI-LOOP VIDEO LOADING
    tryLoadRealVideo(videoUrl, programType) {

  const video = document.getElementById('realVideo');
  const animatedProgram = document.getElementById('animatedProgram');
  if (!video) return;

  video.style.display = 'block';
  if (animatedProgram) animatedProgram.style.display = 'none';

  try {
    video.onloadeddata = null;
    video.onerror = null;
    video.onended = null;

    ['loadeddata','error','ended','stalled','abort','canplay','loadedmetadata'].forEach(ev => {
      try { video.removeEventListener(ev, () => {}); } catch {}
    });

    while (video.firstChild) video.removeChild(video.firstChild);

    video.pause();
    video.currentTime = 0;
    video.removeAttribute('src');
    video.load();
  } catch {}

  video.setAttribute('crossorigin', 'anonymous');
  video.playsInline = true;
  video.autoplay = true;
  video.muted = true;
  video.loop = false;
  video.preload = 'metadata';
  video.disablePictureInPicture = true;

  video.controls = true; // TEMP for testing

  const onLoaded = () => {
    console.log('✅ loadeddata:', { readyState: video.readyState });
    video.loop = false;
    const p = video.play();
    if (p && p.catch) p.catch(e => console.warn('play() catch:', e));
  };

  const onEnded = () => {
    console.log('📺 ended');
    video.pause();
    video.currentTime = 0;
  };

  const onError = () => {
    const err = video.error;
    console.warn('❌ video error', {
      code: err && err.code,
      networkState: video.networkState,
      readyState: video.readyState,
      url: videoUrl
    });
    if (typeof this.showAnimatedProgram === 'function') {
      this.showAnimatedProgram(programType);
    }
  };

  video.addEventListener('loadeddata', onLoaded, { once: true });
  video.addEventListener('ended', onEnded);
  video.addEventListener('error', onError);

  const url = (videoUrl || '').trim();
  console.log('🔗 setting src:', url);
  video.src = url;

  setTimeout(() => {
    if (video.readyState < 2) {
      console.warn('⏳ timeout – no ready data, fallback to animated program');
      if (typeof this.showAnimatedProgram === 'function') {
        this.showAnimatedProgram(programType);
      }
    }
  }, 4000);

}

    showAnimatedProgram(programType) {
        const video = document.getElementById('realVideo');
        const animatedProgram = document.getElementById('animatedProgram');
        
        if (!video || !animatedProgram) return;
        
        const content = this.programContent[programType] || this.programContent.news;
        
        // AGGRESSIVE VIDEO STOP
        video.style.display = 'none';
        video.pause();
        video.currentTime = 0;
        video.src = '';
        video.loop = false;
        
        // Show animation
        animatedProgram.style.display = 'flex';
        animatedProgram.style.background = content.color;
        
        animatedProgram.innerHTML = `
            <div style="text-align: center; color: white;">
                <div class="program-icon">${content.icon}</div>
                <div class="program-title">${content.description}</div>
                <div class="program-subtitle">${content.subtitle}</div>
                <div class="live-indicator">🔴 DIREKTE FRA AZURE v2.5</div>
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

    // COMPLETE PROGRAM END WITH AGGRESSIVE CLEANUP
    endProgram() {
        console.log('📺 ENDING PROGRAM v2.5 - AGGRESSIVE CLEANUP');
        
        // Set flags immediately
        this.isPlayingVideo = false;
        this.programEndedManually = true;
        
        // Clear ALL timeouts
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
            // NUCLEAR OPTION - COMPLETE VIDEO DESTRUCTION
            video.pause();
            video.currentTime = 0;
            video.src = '';
            video.style.display = 'none';
            
            // Remove ALL event listeners
            const eventTypes = ['loadeddata', 'error', 'ended', 'canplay', 'loadstart', 'progress', 
                               'loadedmetadata', 'canplaythrough', 'play', 'pause', 'timeupdate', 
                               'seeking', 'seeked', 'waiting', 'playing'];
            
            eventTypes.forEach(eventType => {
                video.removeEventListener(eventType, this.handleVideoEvent);
            });
            
            // Clear ALL on* properties
            video.onloadeddata = null;
            video.onerror = null;
            video.onended = null;
            video.oncanplay = null;
            video.onloadstart = null;
            video.onprogress = null;
            video.onloadedmetadata = null;
            video.oncanplaythrough = null;
            video.onplay = null;
            video.onpause = null;
            video.ontimeupdate = null;
            video.onseeking = null;
            video.onseeked = null;
            video.onwaiting = null;
            video.onplaying = null;
            
            // FORCE ALL ANTI-LOOP PROPERTIES
            video.loop = false;
            video.autoplay = false;
            video.controls = false;
            
            // Force load reset
            video.load();
            
            console.log('💥 Video completely destroyed and reset');
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
        
        console.log('✅ Program ended completely - ready for next broadcast');
    }

    // NEWS HANDLING
    startNewsRotation() {
        // Use the enhanced news module
        startNewsRotation(8000);
        this.loadNewsFromDataverse();
        
        setInterval(() => {
            if (!this.isPlayingVideo && this.accessToken && this.newsTableExists) {
                console.log('🔄 Auto-refreshing news...');
                this.loadNewsFromDataverse();
            }
        }, 5 * 60 * 1000);
        
        console.log('📰 Enhanced news rotation started with stable speed');
    }

    async loadNewsFromDataverse() {
        try {
            if (!this.accessToken) {
                this.setFallbackNews();
                return;
            }
            
            const headers = {
                'Authorization': `Bearer ${this.accessToken}`,
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0',
                'Accept': 'application/json'
            };

            const testQuery = `${dataverseConfig.webApiEndpoint}/${dataverseConfig.tablePrefix}newsitems?$top=1`;
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
            
            this.newsTableExists = true;
            
            const now = new Date().toISOString();
            const query = `${dataverseConfig.webApiEndpoint}/${dataverseConfig.tablePrefix}newsitems?` +
                `$filter=${dataverseConfig.tablePrefix}isactive eq true and ` +
                `(${dataverseConfig.tablePrefix}expirydate eq null or ${dataverseConfig.tablePrefix}expirydate gt ${now})&` +
                `$orderby=${dataverseConfig.tablePrefix}publishdate desc,${dataverseConfig.tablePrefix}priority desc&` +
                `$top=20&` +
                `$select=${dataverseConfig.tablePrefix}headline,${dataverseConfig.tablePrefix}name,${dataverseConfig.tablePrefix}category,${dataverseConfig.tablePrefix}source,${dataverseConfig.tablePrefix}publishdate`;
            
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
                        
                        // Add publication date
                        const publishDate = item[`${dataverseConfig.tablePrefix}publishdate`];
                        if (publishDate) {
                            const date = new Date(publishDate);
                            const now = new Date();
                            const diffHours = Math.floor((now - date) / (1000 * 60 * 60));
                            
                            let timeAgo;
                            if (diffHours < 1) {
                                timeAgo = 'nettopp';
                            } else if (diffHours < 24) {
                                timeAgo = `${diffHours}t siden`;
                            } else {
                                const diffDays = Math.floor(diffHours / 24);
                                timeAgo = `${diffDays}d siden`;
                            }
                            
                            newsText += ` • ${timeAgo}`;
                        }
                        
                        const source = item[`${dataverseConfig.tablePrefix}source`];
                        if (source) {
                            newsText += ` (${source})`;
                        }
                        
                        return newsText;
                    });
                    
                    // Update the news module with the new items
                    updateNewsItems(this.newsItems);
                    
                    console.log(`✅ Loaded ${this.newsItems.length} news items from Dataverse (newest first)`);
                } else {
                    this.setFallbackNews();
                }
            } else {
                this.setFallbackNews();
            }
        } catch (error) {
            this.newsTableExists = false;
            this.setFallbackNews();
        }
    }

    setFallbackNews() {
        this.newsItems = [
            '📺 Azure Static Web App Broadcast System v2.5 - Anti-Loop + Audio Enabled • nettopp',
            '🔊 Videoer spilles nå av med lyd når tilgjengelig • 1t siden',
            '🚫 Aggressiv anti-loop teknologi implementert • 2t siden',
            '🌐 Norsk TV sender direkte fra Microsoft Azure Cloud Platform • 3t siden',
            '🔄 Automatisk program-scheduling fra Dataverse database • 4t siden',
            '🔒 Enterprise sikkerhet med Microsoft Authentication • 5t siden',
            '📊 Real-time oppdateringer og automatisk failover • 6t siden',
            '🚀 Global deployment via Azure Static Web Apps • 1d siden',
            '⚡ Power Platform integrasjon for enkel administrasjon • 1d siden',
            '🎥 Støtte for lange blob storage URLs med SAS tokens • 1d siden'
        ];
        
        // Update the news module with fallback items
        updateNewsItems(this.newsItems);
        
        console.log('📰 Using fallback news items v2.5 with publication dates');
    }

    // Utility methods
    refreshData() {
        if (!this.isPlayingVideo && this.accessToken) {
            console.log('🔄 Refreshing data v2.5...');
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
        console.log('🎯 Initializing demo mode v2.5...');
        
        this.showElement('loginScreen', false);
        this.showElement('mainContainer', true);
        
        const userDisplayElement = document.getElementById('userDisplayName');
        if (userDisplayElement) {
            userDisplayElement.textContent = 'Demo Bruker v2.5';
        }
        
        this.startClock();
        this.broadcastSchedule = this.createDemoSchedule();
        this.updateScheduleDisplay();
        this.startScheduleChecker();
        this.startNewsRotation();
        
        this.updateDataverseStatus('Demo-modus aktiv v2.5');
        this.showError('Kjører i demo-modus - begrensede funksjoner');
    }

    updateDataverseStatus(status) {
        const timestamp = new Date().toLocaleTimeString('no-NO', { 
            hour: '2-digit', 
            minute: '2-digit'
        });
        const statusElement = document.getElementById('dataverseStatus');
        if (statusElement) {
            statusElement.textContent = `🔗 Dataverse v2.5: ${status} (${timestamp})`;
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
            video.volume = 1.0;
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

export default AzureBroadcastApp;


// Expose class globally for legacy checks
if (typeof window !== 'undefined') { window.AzureBroadcastApp = AzureBroadcastApp; 
    setMsal(msalInstance) {
        this.msalInstance = msalInstance;
    }
}
