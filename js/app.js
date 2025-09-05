/**
 * Azure Broadcast App - Main Application
 * Integrates with Microsoft Dataverse for broadcast scheduling
 * Version: 1.0.0 - Production Ready
 */

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
    organizationId: '2061523f-6d02-f011-b015-0022489e5943'
};

// Initialize MSAL
let msalInstance;

// Safe MSAL initialization with error handling
try {
    if (typeof msal !== 'undefined' && msal.PublicClientApplication) {
        msalInstance = new msal.PublicClientApplication(msalConfig);
        console.log('✅ MSAL instance created successfully');
    } else {
        console.error('❌ MSAL library not properly loaded');
    }
} catch (error) {
    console.error('❌ Failed to create MSAL instance:', error);
}

class AzureBroadcastApp {
    constructor() {
        console.log('🎬 Initializing AzureBroadcastApp...');
        
        // Check MSAL availability
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
        this.retryCount = 0;
        this.maxRetries = 3;
        
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
            'Azure Broadcast System initialiseres...'
        ];
        this.currentNewsIndex = 0;
        
        this.init();
    }

    async init() {
        try {
            console.log('🚀 Azure Broadcast App v1.0.0 starter...');
            console.log('📍 Environment: Production (Azure Static Web App)');
            console.log('🔗 Dataverse Endpoint:', dataverseConfig.webApiEndpoint);
            
            this.setupEventListeners();
            await this.handleAuthRedirect();
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            this.handleGlobalError(error);
        }
    }

    setupEventListeners() {
        try {
            // Authentication events
            const loginBtn = document.getElementById('loginBtn');
            const logoutBtn = document.getElementById('logoutBtn');
            
            if (loginBtn) {
                loginBtn.addEventListener('click', () => this.login());
            }
            
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => this.logout());
            }
            
            // Handle page focus/blur for data refresh
            window.addEventListener('focus', () => this.handlePageFocus());
            window.addEventListener('blur', () => this.handlePageBlur());
            
            // Handle network status changes
            window.addEventListener('online', () => this.handleNetworkOnline());
            window.addEventListener('offline', () => this.handleNetworkOffline());
            
            console.log('✅ Event listeners setup complete');
        } catch (error) {
            console.error('❌ Failed to setup event listeners:', error);
        }
    }

    async handleAuthRedirect() {
        try {
            console.log('🔐 Checking authentication status...');
            const response = await msalInstance.handleRedirectPromise();
            
            if (response) {
                console.log('✅ Login redirect successful');
                this.currentUser = response.account;
                await this.initializeApp();
            } else {
                // Check if user is already logged in
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
            // Force reload if logout fails
            window.location.reload();
        }
    }

    async initializeApp() {
        try {
            console.log('🚀 Initializing application...');
            this.showLoading(true);
            
            // Get access token for Dataverse
            await this.getAccessToken();
            
            // Show main app
            this.showElement('loginScreen', false);
            this.showElement('mainContainer', true);
            
            // Set user info
            const userDisplayElement = document.getElementById('userDisplayName');
            if (userDisplayElement) {
                userDisplayElement.textContent = 
                    this.currentUser.name || this.currentUser.username || 'Ukjent bruker';
            }
            
            // Start app functionality
            this.startClock();
            await this.loadBroadcastSchedule();
            this.startScheduleChecker();
            this.startNewsRotation();
            
            // Show success message
            this.showSuccess('✅ Koblet til Azure og Dataverse!');
            
            console.log('✅ Application initialized successfully');
            
        } catch (error) {
            console.error('❌ App initialization error:', error);
            this.showError('Kunne ikke starte app: ' + error.message);
            
            // Fall back to demo mode
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

            // Get active programs sorted by scheduled time
            const query = `${dataverseConfig.webApiEndpoint}/cr_broadcastschedules?$filter=cr_isactive eq true&$orderby=cr_scheduledtime asc&$top=50`;
            
            const response = await fetch(query, { 
                headers,
                method: 'GET'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.broadcastSchedule = data.value || [];
            this.lastScheduleUpdate = new Date();
            this.retryCount = 0; // Reset retry count on success
            
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
                
                // Fallback to demo data
                this.broadcastSchedule = this.createDemoSchedule();
                this.updateScheduleDisplay();
                this.showError('Dataverse utilgjengelig - bruker demo-data: ' + error.message);
            }
        }
    }

    createDemoSchedule() {
        console.log('📋 Creating demo schedule...');
        const now = new Date();
        const demoSchedule = [];
        
        // Create demo programs with 30 second intervals
        for (let i = 0; i < 20; i++) {
            const scheduledTime = new Date(now.getTime() + (i * 30 * 1000));
            const programTypes = ['weather', 'sports', 'news', 'traffic', 'culture'];
            const programNames = ['Værmelding', 'Sportsnytt', 'Nyhetsoppdatering', 'Trafikkmelding', 'Kulturnytt'];
            
            const typeIndex = i % programTypes.length;
            
            demoSchedule.push({
                cr_broadcastscheduleid: `demo-${i}`,
                cr_name: `${programNames[typeIndex]} #${Math.floor(i/5) + 1}`,
                cr_programtype: programTypes[typeIndex],
                cr_scheduledtime: scheduledTime.toISOString(),
                cr_duration: 8 + (i % 5) * 2, // 8-16 seconds
                cr_videourl: null,
                cr_isactive: true,
                cr_description: `Demo ${programNames[typeIndex]} - Azure Static Web App`,
                cr_priority: i
            });
        }
        
        console.log(`✅ Created ${demoSchedule.length} demo programs`);
        return demoSchedule;
    }

    updateScheduleDisplay() {
        const scheduleList = document.getElementById('scheduleList');
        if (!scheduleList) return;
        
        const now = new Date();
        
        // Filter upcoming programs
        const upcomingPrograms = this.broadcastSchedule
            .filter(program => new Date(program.cr_scheduledtime) > now)
            .slice(0, 8); // Show next 8 programs
        
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
            const scheduledTime = new Date(program.cr_scheduledtime);
            const timeString = scheduledTime.toLocaleTimeString('no-NO', { 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit'
            });
            
            const timeUntil = Math.ceil((scheduledTime.getTime() - now.getTime()) / 1000);
            const isNext = index === 0;
            const isActive = timeUntil <= 60; // Highlight if within 1 minute
            
            let statusColor = '#666';
            let statusText = '';
            
            if (isNext) {
                statusColor = '#4fc3f7';
                statusText = '← NESTE';
            } else if (isActive) {
                statusColor = '#ff9800';
                statusText = '⚡ SNART';
            }
            
            const programIcon = this.programContent[program.cr_programtype]?.icon || '📺';
            
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
                    <div style="color: white; font-weight: 500; margin-bottom: 3px;">
                        ${program.cr_name}
                    </div>
                    <div style="font-size: 0.85rem; opacity: 0.8; display: flex; justify-content: space-between;">
                        <span>${program.cr_duration}s</span>
                        <span>${timeUntil > 0 ? `om ${timeUntil}s` : 'nå'}</span>
                    </div>
                    ${program.cr_description ? `
                        <div style="font-size: 0.8rem; opacity: 0.6; margin-top: 5px; font-style: italic;">
                            ${program.cr_description}
                        </div>
                    ` : ''}
                </div>
            `;
        });
        
        scheduleList.innerHTML = html;
        
        // Set next program for countdown
        if (upcomingPrograms.length > 0) {
            this.nextBroadcastTime = new Date(upcomingPrograms[0].cr_scheduledtime);
            this.currentProgramIndex = this.broadcastSchedule.indexOf(upcomingPrograms[0]);
            
            console.log(`📺 Next program: ${upcomingPrograms[0].cr_name} at ${this.nextBroadcastTime.toLocaleTimeString()}`);
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
        
        updateClock(); // Update immediately
        setInterval(updateClock, 1000);
        
        console.log('🕒 Clock started');
    }

    startScheduleChecker() {
        // Check every second for program start times
        this.scheduleCheckInterval = setInterval(() => {
            this.checkAndStartProgram();
            this.updateCountdown();
        }, 1000);
        
        // Reload schedule every 2 minutes if not playing video
        setInterval(() => {
            if (!this.isPlayingVideo && this.accessToken) {
                const timeSinceUpdate = new Date() - this.lastScheduleUpdate;
                if (timeSinceUpdate > 2 * 60 * 1000) { // 2 minutes
                    console.log('🔄 Auto-refreshing schedule...');
                    this.loadBroadcastSchedule();
                }
            }
        }, 30 * 1000); // Check every 30 seconds
        
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
            // Change color and text based on time left
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
        
        // Start program if time has arrived
        if (now >= this.nextBroadcastTime) {
            const currentProgram = this.broadcastSchedule[this.currentProgramIndex];
            if (currentProgram) {
                console.log(`🎬 Auto-starting program: ${currentProgram.cr_name}`);
                this.startProgram(currentProgram);
            } else {
                console.warn('⚠️ No program found for current index:', this.currentProgramIndex);
                this.updateScheduleDisplay(); // Refresh schedule
            }
        }
    }

    async startProgram(program) {
        console.log(`🎬 Starting program: ${program.cr_name}`);
        this.isPlayingVideo = true;
        
        // Hide UI elements
        this.showElement('backgroundScreen', false);
        this.showElement('videoContainer', true);
        this.showElement('liveCountdown', false);
        
        // Update overlay
        const titleElement = document.getElementById('currentProgramTitle');
        if (titleElement) {
            titleElement.textContent = program.cr_name;
        }
        
        // Try video or fallback to animation
        if (program.cr_videourl && program.cr_videourl.trim()) {
            console.log(`🎥 Loading video: ${program.cr_videourl}`);
            this.tryLoadRealVideo(program.cr_videourl, program.cr_programtype);
        } else {
            console.log(`🎨 Using animated fallback for: ${program.cr_programtype}`);
            this.showAnimatedProgram(program.cr_programtype);
        }
        
        // Start progress bar
        this.startProgressBar(program.cr_duration);

        // End program after specified duration
        setTimeout(() => {
            this.endProgram();
        }, program.cr_duration * 1000);
        
        // Update Dataverse status
        this.updateDataverseStatus(`Sender: ${program.cr_name}`);
    }

    tryLoadRealVideo(videoUrl, programType) {
        const video = document.getElementById('realVideo');
        const animatedProgram = document.getElementById('animatedProgram');
        
        if (!video || !animatedProgram) return;
        
        // Reset elements
        video.style.display = 'none';
        animatedProgram.style.display = 'none';
        video.src = '';
        
        // Set loading timeout
        const videoTimeout = setTimeout(() => {
            console.log('⏰ Video loading timeout, using animation fallback');
            this.showAnimatedProgram(programType);
        }, 5000); // 5 second timeout
        
        // Video event handlers
        video.onloadeddata = () => {
            console.log('✅ Video loaded successfully');
            clearTimeout(videoTimeout);
            video.style.display = 'block';
            animatedProgram.style.display = 'none';
            
            video.play().catch(e => {
                console.log('❌ Video autoplay failed:', e.message);
                this.showAnimatedProgram(programType);
            });
        };
        
        video.onerror = (e) => {
            console.log('❌ Video loading failed:', e);
            clearTimeout(videoTimeout);
            this.showAnimatedProgram(programType);
        };
        
        // Load video
        video.src = videoUrl;
        video.load();
    }

    showAnimatedProgram(programType) {
        const video = document.getElementById('realVideo');
        const animatedProgram = document.getElementById('animatedProgram');
        
        if (!video || !animatedProgram) return;
        
        const content = this.programContent[programType] || this.programContent.news;
        
        // Hide video, show animation
        video.style.display = 'none';
        animatedProgram.style.display = 'flex';
        animatedProgram.style.background = content.color;
        
        animatedProgram.innerHTML = `
            <div style="text-align: center; color: white;">
                <div class="program-icon">${content.icon}</div>
                <div class="program-title">${content.description}</div>
                <div class="program-subtitle">${content.subtitle}</div>
                <div class="live-indicator">🔴 DIREKTE FRA AZURE</div>
            </div>
        `;
        
        console.log(`✅ Animated program displayed: ${programType}`);
    }

    startProgressBar(duration) {
        let progress = 0;
        const progressBar = document.getElementById('progressBar');
        if (!progressBar) return;
        
        progressBar.style.width = '0%';
        
        // Clear any existing interval
        if (this.videoProgressInterval) {
            clearInterval(this.videoProgressInterval);
        }
        
        this.videoProgressInterval = setInterval(() => {
            progress += 100 / (duration * 10); // Update 10 times per second
            const currentProgress = Math.min(progress, 100);
            progressBar.style.width = currentProgress + '%';
            
            if (currentProgress >= 100) {
                clearInterval(this.videoProgressInterval);
            }
        }, 100);
        
        console.log(`📊 Progress bar started for ${duration}s`);
    }

    endProgram() {
        console.log('📺 Ending current program');
        this.isPlayingVideo = false;
        
        // Stop and cleanup video
        const video = document.getElementById('realVideo');
        if (video) {
            video.pause();
            video.src = '';
            video.style.display = 'none';
        }
        
        // Hide animated program
        const animatedProgram = document.getElementById('animatedProgram');
        if (animatedProgram) {
            animatedProgram.style.display = 'none';
        }
        
        // Stop progress bar
        if (this.videoProgressInterval) {
            clearInterval(this.videoProgressInterval);
            const progressBar = document.getElementById('progressBar');
            if (progressBar) {
                progressBar.style.width = '0%';
            }
        }
        
        // Show background and countdown
        this.showElement('videoContainer', false);
        this.showElement('backgroundScreen', true);
        this.showElement('liveCountdown', true);
        
        // Update schedule display to show next programs
        this.updateScheduleDisplay();
        this.updateDataverseStatus('Klar for neste sending');
        
        console.log('✅ Program ended, ready for next broadcast');
    }

    startNewsRotation() {
        // Rotate news every 8 seconds
        const rotateNews = () => {
            this.currentNewsIndex = (this.currentNewsIndex + 1) % this.newsItems.length;
            const newsElement = document.getElementById('newsText');
            if (newsElement) {
                newsElement.textContent = this.newsItems[this.currentNewsIndex];
            }
        };
        
        setInterval(rotateNews, 8000);
        
        // Load initial news and try to get from Dataverse
        this.loadNewsFromDataverse();
        
        console.log('📰 News rotation started');
    }

    async loadNewsFromDataverse() {
        try {
            if (!this.accessToken) {
                this.setFallbackNews();
                return;
            }
            
            console.log('📰 Loading news from Dataverse...');
            
            const headers = {
                'Authorization': `Bearer ${this.accessToken}`,
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0',
                'Accept': 'application/json'
            };

            // Try to fetch news items (assuming you have a news table)
            const query = `${dataverseConfig.webApiEndpoint}/cr_newsitems?$filter=cr_isactive eq true&$orderby=createdon desc&$top=15`;
            
            const response = await fetch(query, { headers });
            
            if (response.ok) {
                const data = await response.json();
                if (data.value && data.value.length > 0) {
                    this.newsItems = data.value.map(item => 
                        item.cr_headline || item.cr_name || 'Nyhetsoppdatering fra Dataverse'
                    );
                    console.log(`✅ Loaded ${this.newsItems.length} news items from Dataverse`);
                } else {
                    this.setFallbackNews();
                }
            } else {
                console.log('ℹ️ News table not found, using fallback news');
                this.setFallbackNews();
            }
        } catch (error) {
            console.log('ℹ️ Could not load news from Dataverse:', error.message);
            this.setFallbackNews();
        }
    }

    setFallbackNews() {
        this.newsItems = [
            'Azure Static Web App Broadcast System - Powered by Microsoft Dataverse',
            'Norsk TV sender nå direkte fra Microsoft Azure Cloud Platform med global CDN',
            'Automatisk program-scheduling fra Dataverse database med real-time synkronisering',
            'Skalerbar cloud-løsning for broadcast-industrien med enterprise sikkerhet',
            'Microsoft Authentication og role-based access control for sikker tilgang',
            'Real-time oppdateringer og automatisk failover til demo-data ved tilkoblingsproblemer',
            'Azure Static Web App deployment med global tilgjengelighet og høy oppetid',
            'Integrert med Power Platform for enkel administrasjon av sendeskjema'
        ];
        
        console.log('📰 Using fallback news items');
    }

    // Utility methods
    refreshData() {
        if (!this.isPlayingVideo && this.accessToken) {
            console.log('🔄 Refreshing data...');
            this.loadBroadcastSchedule();
            this.loadNewsFromDataverse();
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
        
        // Don't show error if we're in demo mode
        if (this.accessToken) {
            this.showError('En feil oppstod: ' + (error.message || error));
        }
    }

    initializeDemoMode() {
        console.log('🎯 Initializing demo mode...');
        
        // Show main app even without Dataverse access
        this.showElement('loginScreen', false);
        this.showElement('mainContainer', true);
        
        // Set demo user
        const userDisplayElement = document.getElementById('userDisplayName');
        if (userDisplayElement) {
            userDisplayElement.textContent = 'Demo Bruker';
        }
        
        // Start basic functionality
        this.startClock();
        this.broadcastSchedule = this.createDemoSchedule();
        this.updateScheduleDisplay();
        this.startScheduleChecker();
        this.startNewsRotation();
        
        this.updateDataverseStatus('Demo-modus aktiv');
        this.showError('Kjører i demo-modus - begrensede funksjoner');
    }

    updateDataverseStatus(status) {
        const timestamp = new Date().toLocaleTimeString('no-NO', { 
            hour: '2-digit', 
            minute: '2-digit'
        });
        const statusElement = document.getElementById('dataverseStatus');
        if (statusElement) {
            statusElement.textContent = `🔗 Dataverse: ${status} (${timestamp})`;
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

// Safe initialization with error handling
(function() {
    console.log('📦 Azure Broadcast App JavaScript loaded successfully');
    console.log('🔧 Environment: Production');
    console.log('📅 Build date:', new Date().toISOString());
    
    // Verify all required global objects are available
    if (typeof window === 'undefined') {
        console.error('❌ Window object not available');
        return;
    }
    
    // The app will be initialized from index.html when DOM is ready
    console.log('✅ App.js ready for initialization');
})();
