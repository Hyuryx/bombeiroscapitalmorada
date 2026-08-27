document.addEventListener('DOMContentLoaded', () => {
    const particlesContainer = document.getElementById('particles-js');

    // Inicializar particles.js (sem a parte do stats.js que é só para teste de performance)
    if (particlesContainer) {
        particlesJS("particles-js", {
            "particles": {
                "number": { "value": 35, "density": { "enable": true, "value_area": 1000 } },
                "color": { "value": "#ffffff" },
                "shape": {
                    "type": "circle",
                    "stroke": { "width": 0, "color": "#000000" }
                },
                "opacity": {
                    "value": 0.25,
                    "random": true,
                    "anim": { "enable": true, "speed": 1, "opacity_min": 0.1, "sync": false }
                },
                "size": {
                    "value": 2.5,
                    "random": true,
                    "anim": { "enable": false, "speed": 40, "size_min": 0.1, "sync": false }
                },
                "line_linked": {
                    "enable": true,
                    "distance": 180,
                    "color": "#ffffff",
                    "opacity": 0.15,
                    "width": 1
                },
                "move": {
                    "enable": true,
                    "speed": 2.5,
                    "direction": "none",
                    "random": false,
                    "straight": false,
                    "out_mode": "out",
                    "bounce": false,
                    "attract": { "enable": false, "rotateX": 600, "rotateY": 1200 }
                }
            },
            "interactivity": {
                "detect_on": "canvas",
                "events": {
                    "onhover": { "enable": false, "mode": "repulse" },
                    "onclick": { "enable": false, "mode": "push" },
                    "resize": true
                }
            },
            "retina_detect": true
        });
    }

    // Lógica da Navegação Global
    const globalNavItems = document.querySelectorAll('.nav-item');
    const globalViews = document.querySelectorAll('.global-view');

    function switchGlobalView(targetId) {
        localStorage.setItem('activeTab', targetId);
        globalNavItems.forEach(nav => {
            if(nav.getAttribute('data-global-target') === targetId) {
                nav.classList.add('active');
            } else {
                nav.classList.remove('active');
            }
        });

        globalViews.forEach(view => {
            if(view.id === targetId) {
                view.classList.add('active');
                view.style.display = '';
                
                // Reset to the first sidebar item and section to ensure it is always active upon entry
                const sidebarNavItems = view.querySelectorAll('.sidebar-nav li');
                const contentSections = view.querySelectorAll('.content-section');
                
                if (sidebarNavItems.length > 0 && contentSections.length > 0) {
                    sidebarNavItems.forEach(n => n.classList.remove('active'));
                    sidebarNavItems[0].classList.add('active');
                    
                    contentSections.forEach(s => {
                        s.classList.remove('active');
                        s.style.display = 'none';
                    });
                    contentSections[0].classList.add('active');
                    contentSections[0].style.display = 'block';
                }
            } else {
                view.classList.remove('active');
                view.style.display = 'none';
            }
        });

        // Atualizar planilha ao abrir a aba Planilhas para garantir tempo real
        if (targetId === 'view-planilhas') {
            const iframe = document.getElementById('planilha-iframe');
            if (iframe) {
                // Remove the old src and set it again to force a reload from Google
                const currentSrc = iframe.src;
                iframe.src = '';
                setTimeout(() => iframe.src = currentSrc, 10);
            }
        }

        // As notificações da central (lateral) agora permanecem visíveis em todas as abas.
        // A lógica de ocultar ao mudar de aba foi removida a pedido do usuário.

        // Mostrar Modal Destaque (Disparar evento para notificacoes.js)
        window.dispatchEvent(new CustomEvent('tabChanged', { detail: { targetId } }));
    }

    globalNavItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetId = item.getAttribute('data-global-target');
            switchGlobalView(targetId);
            
            // Fechar menu mobile ao clicar em um item
            const navTabs = document.getElementById('nav-tabs');
            if (navTabs && navTabs.classList.contains('open')) {
                navTabs.classList.remove('open');
            }
        });
    });

    // Lógica do botão de menu mobile (Global Navbar)
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            const navTabs = document.getElementById('nav-tabs');
            if (navTabs) {
                navTabs.classList.toggle('open');
            }
        });
    }

    // Ação de clique na logo da sidebar para voltar à tela inicial (Início)
    // Atualizado para pegar todas as logos de sidebars no site
    const sidebarLogos = document.querySelectorAll('.sidebar-logo');
    sidebarLogos.forEach(logo => {
        logo.addEventListener('click', () => {
            switchGlobalView('view-inicio');
        });
    });

    const navItems = document.querySelectorAll('.sidebar-nav li');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Find the parent global-view to scope the changes
            const globalView = item.closest('.global-view');
            if (!globalView) return;

            // Remove active class from all nav items within this sidebar
            const localNavItems = globalView.querySelectorAll('.sidebar-nav li');
            localNavItems.forEach(nav => nav.classList.remove('active'));
            
            // Add active class to clicked item
            item.classList.add('active');

            // Get target section id
            const targetId = item.getAttribute('data-target');

            // Get all sections within this global-view
            const localSections = globalView.querySelectorAll('.content-section');

            localSections.forEach(section => {
                if (section.id === targetId) {
                    section.classList.add('active');
                    section.style.display = 'block';
                } else {
                    section.classList.remove('active');
                    section.style.display = 'none';
                }
            });

            // Se for mobile, fecha a gaveta lateral ao selecionar um item
            if (window.innerWidth <= 768) {
                const sidebar = item.closest('.sidebar');
                if (sidebar) {
                    sidebar.classList.add('collapsed');
                }
            }

            // Disparar evento para atualizar banner / modal ao clicar na sub-aba
            window.dispatchEvent(new CustomEvent('tabChanged', { detail: { targetId } }));
        });
    });

    // Lógica do Modal (Lightbox)
    const modal = document.getElementById("image-modal");
    const modalImg = document.getElementById("modal-img");
    const closeBtn = document.querySelector(".modal-close");
    
    // Variáveis para controle do Zoom e Pan
    let scale = 1;
    let panning = false;
    let pointX = 0;
    let pointY = 0;
    let startX = 0;
    let startY = 0;

    function resetZoom() {
        scale = 1;
        pointX = 0;
        pointY = 0;
        if (modalImg) {
            modalImg.style.transform = `translate(${pointX}px, ${pointY}px) scale(${scale})`;
            modalImg.style.cursor = 'zoom-in';
        }
    }

    if (modal && modalImg) {
        document.querySelectorAll('.content-section img:not(.no-lightbox), .cards-grid img:not(.no-lightbox)').forEach(img => {
            img.addEventListener('click', function() {
                modal.style.display = "flex";
                modalImg.src = this.src;
                
                // Reseta o zoom toda vez que abre uma nova imagem
                resetZoom();
                
                // Popula o painel de informações se a imagem tiver os dados
                const title = this.getAttribute('data-title');
                const desc = this.getAttribute('data-desc');
                const infoPanel = document.getElementById('modal-info-panel');
                const titleEl = document.getElementById('modal-title');
                const descEl = document.getElementById('modal-desc');
                
                if (title && desc && infoPanel) {
                    titleEl.textContent = title;
                    descEl.innerHTML = desc;
                    infoPanel.style.display = "block";
                } else if (infoPanel) {
                    infoPanel.style.display = "none";
                }
            });
        });

        // Evento de Scroll para Zoom
        modalImg.addEventListener('wheel', (e) => {
            e.preventDefault(); // Evita a rolagem da página
            
            // Calcula a direção do zoom (aumentar ou diminuir)
            const delta = Math.sign(e.deltaY) * -0.2;
            const newScale = scale + delta;
            
            // Limita o zoom entre 1x e 5x
            if (newScale >= 1 && newScale <= 5) {
                scale = newScale;
                
                // Se voltou ao tamanho normal, reseta a posição de arrasto
                if (scale === 1) {
                    pointX = 0;
                    pointY = 0;
                    modalImg.style.cursor = 'zoom-in';
                } else {
                    modalImg.style.cursor = 'grab';
                }
                
                modalImg.style.transform = `translate(${pointX}px, ${pointY}px) scale(${scale})`;
            }
        });

        // Eventos para Arrastar (Pan) a imagem quando estiver com zoom
        modalImg.addEventListener('mousedown', (e) => {
            if (scale > 1) {
                e.preventDefault();
                panning = true;
                startX = e.clientX - pointX;
                startY = e.clientY - pointY;
                modalImg.style.cursor = 'grabbing';
            }
        });

        modalImg.addEventListener('mousemove', (e) => {
            if (!panning) return;
            e.preventDefault();
            pointX = e.clientX - startX;
            pointY = e.clientY - startY;
            modalImg.style.transform = `translate(${pointX}px, ${pointY}px) scale(${scale})`;
        });

        modalImg.addEventListener('mouseup', () => {
            if (panning) {
                panning = false;
                modalImg.style.cursor = scale > 1 ? 'grab' : 'zoom-in';
            }
        });

        modalImg.addEventListener('mouseleave', () => {
            if (panning) {
                panning = false;
                modalImg.style.cursor = scale > 1 ? 'grab' : 'zoom-in';
            }
        });

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.style.display = "none";
                resetZoom();
            });
        }

        modal.addEventListener('click', (e) => {
            // Fecha o modal se clicar fora da imagem ou do painel de info
            if (e.target === modal || e.target.classList.contains('modal-image-container')) {
                modal.style.display = "none";
                resetZoom();
            }
        });
    }

    // Modal Destaque (Avisos) Setup
    const modalDestaque = document.getElementById('modal-destaque');
    if (modalDestaque) {
        const closeBtnDestaque = modalDestaque.querySelector('.modal-destaque-close');
        const textCloseBtn = modalDestaque.querySelector('.modal-destaque-text-close');
        const textOverlay = modalDestaque.querySelector('.modal-destaque-text-overlay');

        if (closeBtnDestaque) {
            closeBtnDestaque.addEventListener('click', () => {
                modalDestaque.style.display = 'none';
            });
        }
        
        if (textCloseBtn && textOverlay) {
            textCloseBtn.addEventListener('click', () => {
                textOverlay.style.display = 'none';
            });
        }
    }

    // Lógica genérica para esconder/mostrar qualquer sidebar
    const sidebarToggleBtns = document.querySelectorAll('.sidebar-toggle-btn');
    sidebarToggleBtns.forEach(btn => {
        // Usar click para funcionar bem no mobile e no PC
        btn.addEventListener('click', (e) => {
            const sidebar = e.currentTarget.closest('.sidebar');
            if (sidebar) {
                sidebar.classList.toggle('collapsed');
            }
        });
    });

    // Se a tela for de celular/tablet ao carregar, iniciar as sidebars recolhidas para não cobrir o conteúdo
    if (window.innerWidth <= 768) {
        document.querySelectorAll('.sidebar').forEach(sidebar => {
            sidebar.classList.add('collapsed');
        });
    }

    // Lógica do Relógio Digital
    function updateClock() {
        const clockTime = document.getElementById('clock-time');
        const clockDate = document.getElementById('clock-date');
        
        if (clockTime && clockDate) {
            const now = new Date();
            
            // Hora formatada: 00:00:00
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            clockTime.textContent = `${hours}:${minutes}:${seconds}`;
            
            // Data formatada
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            clockDate.textContent = now.toLocaleDateString('pt-BR', options);
        }
    }
    
    // Inicia o relógio
    setInterval(updateClock, 1000);
    updateClock(); // Chama imediatamente para não esperar 1s

    // Restaura a aba salva ao recarregar a página
    const activeTab = localStorage.getItem('activeTab');
    if (activeTab) {
        switchGlobalView(activeTab);
    }

    // Lógica da Tela de Login / Bloqueio
    const loginScreen = document.getElementById('login-screen');
    const loginPassword = document.getElementById('login-password');
    const loginSubmit = document.getElementById('login-submit');
    const loginError = document.getElementById('login-error');

    if (loginScreen) {
        // Relógio da tela de login
        const loginTime = document.getElementById('login-time');
        const loginDate = document.getElementById('login-date');
        
        function updateLoginClock() {
            if (loginTime && loginDate) {
                const now = new Date();
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');
                const seconds = String(now.getSeconds()).padStart(2, '0');
                loginTime.textContent = `${hours}:${minutes}:${seconds}`;
                
                const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                loginDate.textContent = now.toLocaleDateString('pt-BR', options);
            }
        }
        setInterval(updateLoginClock, 1000);
        updateLoginClock();

        let inactivityTimer;
        let absoluteTimer;
        const INACTIVITY_LIMIT = 3 * 60 * 1000; // 3 min
        const ABSOLUTE_LIMIT = 6 * 60 * 1000; // 6 min

        let isUnlocked = false;

        function lockScreen() {
            isUnlocked = false;
            loginScreen.style.display = 'flex';
            // Usa um pequeno delay para a transição de opacidade funcionar se estava 'none'
            setTimeout(() => {
                loginScreen.style.opacity = '1';
                loginScreen.style.visibility = 'visible';
            }, 10);
            document.body.classList.add('locked');
            const digitalClock = document.getElementById('digital-clock');
            if (digitalClock) digitalClock.style.display = 'none';
            loginPassword.value = '';
            loginError.style.display = 'none';
            stopTimers();
            // Remove o cookie para garantir que o F5 não burle o bloqueio
            document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        }

        function startTimers() {
            stopTimers();
            inactivityTimer = setTimeout(lockScreen, INACTIVITY_LIMIT);
            absoluteTimer = setTimeout(lockScreen, ABSOLUTE_LIMIT);
        }

        function stopTimers() {
            clearTimeout(inactivityTimer);
            clearTimeout(absoluteTimer);
        }

        function resetInactivityTimer() {
            if (isUnlocked) {
                clearTimeout(inactivityTimer);
                inactivityTimer = setTimeout(lockScreen, INACTIVITY_LIMIT);
                localStorage.setItem('cbm_last_activity', Date.now());
            }
        }

        ['mousemove', 'mousedown', 'keypress', 'touchmove', 'scroll'].forEach(evt => 
            document.addEventListener(evt, resetInactivityTimer)
        );

        // Verifica se já está logado via cookie
        if (document.cookie.includes('auth_token=autenticado_com_sucesso')) {
            const lastActivity = localStorage.getItem('cbm_last_activity');
            const now = Date.now();
            
            // Se passou mais tempo do que o limite de inatividade desde a última vez
            if (lastActivity && (now - parseInt(lastActivity) > INACTIVITY_LIMIT)) {
                document.body.classList.add('locked');
                const digitalClock = document.getElementById('digital-clock');
                if (digitalClock) digitalClock.style.display = 'none';
                document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                if (loginScreen) {
                    loginScreen.style.display = 'flex';
                    loginScreen.style.opacity = '1';
                    loginScreen.style.visibility = 'visible';
                }
            } else {
                isUnlocked = true;
                loginScreen.style.display = 'none';
                document.body.classList.remove('locked');
                const digitalClock = document.getElementById('digital-clock');
                if (digitalClock) digitalClock.style.display = 'block';
                startTimers();
                localStorage.setItem('cbm_last_activity', now);
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('tabChanged', { detail: { targetId: 'login-event' } }));
                }, 500);
            }
        } else {
            // Inicia bloqueado por padrão
            document.body.classList.add('locked');
            const digitalClock = document.getElementById('digital-clock');
            if (digitalClock) digitalClock.style.display = 'none';
            if (loginScreen) {
                loginScreen.style.display = 'flex';
                loginScreen.style.opacity = '1';
                loginScreen.style.visibility = 'visible';
            }
        }

        async function handleLogin() {
            const btn = document.getElementById('login-submit');
            if (btn) btn.disabled = true;
            try {
                const response = await fetch('/api/auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: loginPassword.value })
                });

                if (response.ok) {
                    // Senha Correta
                    isUnlocked = true;
                    loginError.style.display = 'none';
                    loginScreen.style.opacity = '0';
                    setTimeout(() => {
                        loginScreen.style.display = 'none';
                        document.body.classList.remove('locked');
                        const digitalClock = document.getElementById('digital-clock');
                        if (digitalClock) digitalClock.style.display = 'block';
                        startTimers();
                        if (btn) btn.disabled = false;
                        
                        // Disparar evento especial de login para mostrar o aviso
                        window.dispatchEvent(new CustomEvent('tabChanged', { detail: { targetId: 'login-event' } }));
                    }, 500);
                } else {
                    // Senha Incorreta
                    loginError.style.display = 'block';
                    loginPassword.value = '';
                    loginPassword.focus();
                    if (btn) btn.disabled = false;
                }
            } catch (error) {
                console.error("Erro na autenticação:", error);
                loginError.textContent = "Erro ao conectar com o servidor.";
                loginError.style.display = 'block';
                if (btn) btn.disabled = false;
            }
        }

        if (loginSubmit) loginSubmit.addEventListener('click', handleLogin);
        if (loginPassword) loginPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleLogin();
            }
        });
    }
});

// Gallery Folders Logic
function openGalleryFolder(folderName) {
    const galeriaMenu = document.getElementById('galeria-menu');
    const contentArea = document.getElementById('galeria-content-area');
    const contents = document.querySelectorAll('.gallery-content-tab');
    
    // Hide all tabs
    contents.forEach(content => {
        content.style.display = 'none';
        content.classList.remove('active');
    });

    // Hide menu and show content area
    if (galeriaMenu) galeriaMenu.style.display = 'none';
    if (contentArea) contentArea.style.display = 'block';

    // Show specific folder content
    const activeContent = document.getElementById(`galeria-${folderName}`);
    if (activeContent) {
        activeContent.style.display = 'block';
        setTimeout(() => {
            activeContent.classList.add('active');
        }, 10);
    }
}

function closeGalleryFolder() {
    const galeriaMenu = document.getElementById('galeria-menu');
    const contentArea = document.getElementById('galeria-content-area');
    
    // Show menu and hide content area
    if (galeriaMenu) galeriaMenu.style.display = 'grid'; // Using grid to maintain the cards-grid layout
    if (contentArea) contentArea.style.display = 'none';
}

// Custom Video Player Controls
function initCustomVideoPlayers() {
    document.querySelectorAll(".video-card").forEach((card) => {
        const video = card.querySelector(".gallery-video");
        if (!video) return;

        const centerPlay = card.querySelector(".center-play");
        const playButton = card.querySelector(".play-button");
        const muteButton = card.querySelector(".mute-button");
        const fullscreenButton = card.querySelector(".fullscreen-button");

        const progressBar = card.querySelector(".progress-bar");
        const volumeBar = card.querySelector(".volume-bar");

        const currentTimeElement = card.querySelector(".current-time");
        const durationElement = card.querySelector(".duration");

        function formatTime(seconds) {
            if (!Number.isFinite(seconds)) {
                return "0:00";
            }

            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = Math.floor(seconds % 60)
                .toString()
                .padStart(2, "0");

            return `${minutes}:${remainingSeconds}`;
        }

        function updatePlayButtons() {
            const paused = video.paused;

            if (playButton) {
                playButton.textContent = paused ? "▶" : "❚❚";
                playButton.setAttribute(
                    "aria-label",
                    paused ? "Reproduzir" : "Pausar"
                );
            }

            if (centerPlay) {
                centerPlay.hidden = !paused;
            }
        }

        async function togglePlay() {
            try {
                if (video.paused) {
                    await video.play();
                } else {
                    video.pause();
                }
            } catch (error) {
                console.error("Não foi possível reproduzir o vídeo:", error);
            }
        }

        function updateProgress() {
            if (!progressBar || !currentTimeElement) return;
            if (!Number.isFinite(video.duration) || video.duration <= 0) {
                progressBar.value = 0;
                currentTimeElement.textContent = "0:00";
                return;
            }

            progressBar.value = (video.currentTime / video.duration) * 100;
            currentTimeElement.textContent = formatTime(video.currentTime);
        }

        function updateVolumeButton() {
            if (!muteButton) return;
            const muted = video.muted || video.volume === 0;

            muteButton.textContent = muted ? "🔇" : "🔊";
            muteButton.setAttribute(
                "aria-label",
                muted ? "Ativar som" : "Desativar som"
            );
        }

        if (playButton) playButton.addEventListener("click", togglePlay);
        if (centerPlay) centerPlay.addEventListener("click", togglePlay);
        video.addEventListener("click", togglePlay);

        video.addEventListener("play", updatePlayButtons);
        video.addEventListener("pause", updatePlayButtons);
        video.addEventListener("ended", updatePlayButtons);

        video.addEventListener("loadedmetadata", () => {
            if (durationElement) durationElement.textContent = formatTime(video.duration);
            updateProgress();
        });

        video.addEventListener("timeupdate", updateProgress);

        if (progressBar) {
            progressBar.addEventListener("input", () => {
                if (!Number.isFinite(video.duration)) {
                    return;
                }

                video.currentTime =
                    (Number(progressBar.value) / 100) * video.duration;
            });
        }

        if (muteButton) {
            muteButton.addEventListener("click", () => {
                video.muted = !video.muted;
                updateVolumeButton();
            });
        }

        if (volumeBar) {
            volumeBar.addEventListener("input", () => {
                video.volume = Number(volumeBar.value);
                video.muted = video.volume === 0;
                updateVolumeButton();
            });
        }

        video.addEventListener("volumechange", () => {
            if (volumeBar) volumeBar.value = video.muted ? 0 : video.volume;
            updateVolumeButton();
        });

        if (fullscreenButton) {
            fullscreenButton.addEventListener("click", async () => {
                try {
                    if (!document.fullscreenElement) {
                        await card.requestFullscreen();
                    } else {
                        await document.exitFullscreen();
                    }
                } catch (error) {
                    console.error("Não foi possível ativar a tela cheia:", error);
                }
            });
        }

        updatePlayButtons();
        updateVolumeButton();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initCustomVideoPlayers();

    // Alternar Efeitos Gráficos (Modo Desempenho / Olhinho)
    const btnToggleEffects = document.getElementById('btn-toggle-effects');
    if (btnToggleEffects) {
        const iconEyeOpen = btnToggleEffects.querySelector('.icon-eye-open');
        const iconEyeClosed = btnToggleEffects.querySelector('.icon-eye-closed');
        const effectsBtnText = btnToggleEffects.querySelector('.effects-btn-text');

        function updateEffectsUI(isNoEffects) {
            if (isNoEffects) {
                document.documentElement.classList.add('no-effects');
                document.body.classList.add('no-effects');
                if (iconEyeOpen) iconEyeOpen.style.display = 'none';
                if (iconEyeClosed) iconEyeClosed.style.display = 'inline-block';
                if (effectsBtnText) effectsBtnText.textContent = 'Efeitos: OFF';
                btnToggleEffects.title = 'Reativar Efeitos Gráficos (Modo Normal)';
            } else {
                document.documentElement.classList.remove('no-effects');
                document.body.classList.remove('no-effects');
                if (iconEyeOpen) iconEyeOpen.style.display = 'inline-block';
                if (iconEyeClosed) iconEyeClosed.style.display = 'none';
                if (effectsBtnText) effectsBtnText.textContent = 'Efeitos: ON';
                btnToggleEffects.title = 'Desativar Efeitos Gráficos (Modo Desempenho)';
            }
        }

        // Inicializar estado com base no localStorage ou classe existente no documentElement
        const initialNoEffects = localStorage.getItem('cbm-no-effects') === 'true' || document.documentElement.classList.contains('no-effects');
        updateEffectsUI(initialNoEffects);

        btnToggleEffects.addEventListener('click', () => {
            const currentNoEffects = document.documentElement.classList.contains('no-effects') || document.body.classList.contains('no-effects');
            const newNoEffects = !currentNoEffects;
            localStorage.setItem('cbm-no-effects', newNoEffects);
            updateEffectsUI(newNoEffects);
        });
    }
});

