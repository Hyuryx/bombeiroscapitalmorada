const formulario = document.getElementById("formularioAviso");
const listaAvisos = document.getElementById("listaAvisos");
const statusServidor = document.getElementById("statusServidor");
const quantidadeAvisos = document.getElementById("quantidadeAvisos");
const tituloFormulario = document.getElementById("tituloFormulario");
const cancelarEdicao = document.getElementById("cancelarEdicao");
const salvarArquivo = document.getElementById("salvarArquivo");
const semFimCheckbox = document.getElementById("semFim");
const fimInput = document.getElementById("fim");
const inicioInput = document.getElementById("inicio");
const imagemInput = document.getElementById("imagem");
const previewImagem = document.getElementById("previewImagem");

let imagemBase64 = "";

if (imagemInput) {
  imagemInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) {
      imagemBase64 = "";
      previewImagem.style.display = "none";
      return;
    }
    const reader = new FileReader();
    reader.onload = function(event) {
      const img = new Image();
      img.onload = function() {
        // Redimensionar e comprimir a imagem
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        
        // Comprimir para JPEG 70% qualidade
        imagemBase64 = canvas.toDataURL("image/jpeg", 0.7);
        previewImagem.src = imagemBase64;
        previewImagem.style.display = "block";
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

semFimCheckbox.addEventListener("change", (e) => {
  if (e.target.checked) {
    fimInput.disabled = true;
    fimInput.removeAttribute("required");
  } else {
    fimInput.disabled = false;
    fimInput.setAttribute("required", "required");
  }
});

let avisos = [];
let idEmEdicao = null;

function escaparHtml(valor = "") {
  return String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function criarId(titulo) {
  const slug = titulo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${slug}-${Date.now()}`;
}

function converterParaISOComFuso(valor) {
  if (!valor) {
    return "";
  }

  return `${valor}:00-03:00`;
}

function converterParaCampoData(valor) {
  if (!valor) {
    return "";
  }

  return valor.substring(0, 16);
}

function formatarData(valor) {
  if (!valor) {
    return "Não informada";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo"
  }).format(new Date(valor));
}

function prioridadePeso(prioridade) {
  const pesos = {
    urgente: 1,
    importante: 2,
    normal: 3
  };

  return pesos[prioridade] || 99;
}

async function carregarAvisos() {
  try {
    const resposta = await fetch("/api/avisos");

    if (!resposta.ok) {
      throw new Error("Não foi possível carregar os avisos.");
    }

    avisos = await resposta.json();

    statusServidor.textContent = "Arquivo carregado";
    statusServidor.className = "status sucesso";

    removerAvisosExpirados();
    renderizarAvisos();
  } catch (erro) {
    statusServidor.textContent = erro.message;
    statusServidor.className = "status erro";
  }
}

function renderizarAvisos() {
  const avisosOrdenados = avisos
    .map((aviso, indiceOriginal) => ({
      aviso,
      indiceOriginal
    }))
    .sort((a, b) => {
      return (
        prioridadePeso(a.aviso.prioridade) -
        prioridadePeso(b.aviso.prioridade)
      );
    });

  quantidadeAvisos.textContent =
    avisos.length === 1
      ? "1 aviso cadastrado"
      : `${avisos.length} avisos cadastrados`;

  if (avisos.length === 0) {
    listaAvisos.innerHTML = `
      <div class="lista-vazia">
        Nenhum aviso foi cadastrado.
      </div>
    `;

    return;
  }

  listaAvisos.innerHTML = avisosOrdenados
    .map(({ aviso, indiceOriginal }) => {
      return `
        <article class="item-aviso prioridade-${aviso.prioridade}">
          <div class="item-conteudo">
            <div class="item-topo">
              <span class="categoria">
                ${escaparHtml(aviso.categoria)}
              </span>

              <span class="prioridade">
                ${escaparHtml(aviso.prioridade)}
              </span>

              ${
                aviso.ativo
                  ? (new Date(aviso.inicio) > new Date() ? '<span class="situacao ativo" style="background-color: #f59e0b; color: #fff;">Programado</span>' : '<span class="situacao ativo">Ativo</span>')
                  : '<span class="situacao inativo">Inativo</span>'
              }
            </div>

            <h3>${escaparHtml(aviso.titulo)}</h3>

            <p>${escaparHtml(aviso.descricao)}</p>

            <div class="datas">
              <span>
                <strong>Início:</strong>
                ${formatarData(aviso.inicio)}
              </span>
              ${["curso", "evento", "manutencao"].includes(aviso.categoria) ? `
              <span>
                <strong>Fim:</strong>
                ${aviso.fim ? formatarData(aviso.fim) : "Sem limite"}
              </span>
              ` : ''}
            </div>

            <div class="formas-exibicao">
              ${aviso.mostrarPopup ? "<span>Pop-up</span>" : ""}
              ${
                aviso.mostrarAvisosGerais
                  ? "<span>Avisos Gerais</span>"
                  : ""
              }
              ${aviso.piscar ? "<span>Destacado</span>" : ""}
            </div>
          </div>

          <div class="item-acoes">
            <button
              type="button"
              onclick="editarAviso('${aviso.id}')"
              class="botao secundario"
            >
              Editar
            </button>

            <button
              type="button"
              onclick="excluirAviso('${aviso.id}')"
              class="botao perigo"
            >
              Excluir
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

formulario.addEventListener("submit", (evento) => {
  evento.preventDefault();

  const inicio = document.getElementById("inicio").value;
  let fim = document.getElementById("fim").value;
  const semFim = document.getElementById("semFim").checked;

  if (semFim) {
    fim = "";
  } else {
    if (new Date(inicio) >= new Date(fim)) {
      alert(
        "A data de encerramento precisa ser posterior à data inicial."
      );
  
      return;
    }
  
    if (new Date(fim) <= new Date()) {
      alert(
        "A data e hora de encerramento já passou. O sistema não permite publicar avisos expirados."
      );
  
      return;
    }
  }

  const titulo = document.getElementById("titulo").value.trim();

  const avisoExistente =
    idEmEdicao !== null ? avisos.find((a) => a.id === idEmEdicao) : null;

  const aviso = {
    id: avisoExistente?.id || criarId(titulo),
    titulo,
    resumo: document.getElementById("resumo").value.trim(),
    descricao: document
      .getElementById("descricao")
      .value
      .trim(),
    imagem: imagemBase64,
    categoria: document.getElementById("categoria").value,
    prioridade: document.getElementById("prioridade").value,
    inicio: converterParaISOComFuso(inicio),
    fim: semFim ? null : converterParaISOComFuso(fim),
    link: document.getElementById("link").value.trim(),
    mostrarPopup: document
      .getElementById("mostrarPopup")
      .checked,
    mostrarAvisosGerais: document
      .getElementById("mostrarAvisosGerais")
      .checked,
    piscar: document.getElementById("piscar").checked,
    ativo: document.getElementById("ativo").checked
  };

  if (idEmEdicao === null) {
    avisos.push(aviso);
  } else {
    const index = avisos.findIndex((a) => a.id === idEmEdicao);
    if (index !== -1) {
      avisos[index] = aviso;
    }
  }

  limparFormulario();
  renderizarAvisos();
  salvarAvisosNoServidor(true); // Auto-save silencioso
});

window.editarAviso = function(id) {
  const aviso = avisos.find((a) => a.id === id);
  if (!aviso) return;

  idEmEdicao = id;

  document.getElementById("avisoId").value = aviso.id;
  document.getElementById("titulo").value = aviso.titulo;
  document.getElementById("resumo").value = aviso.resumo || "";
  document.getElementById("descricao").value = aviso.descricao;
  
  imagemBase64 = aviso.imagem || "";
  if (imagemBase64) {
    document.getElementById("previewImagem").src = imagemBase64;
    document.getElementById("previewImagem").style.display = "block";
  } else {
    document.getElementById("previewImagem").style.display = "none";
  }
  document.getElementById("imagem").value = ""; // Reseta o input file visualmente

  document.getElementById("categoria").value = aviso.categoria;
  document.getElementById("prioridade").value = aviso.prioridade;
  document.getElementById("inicio").value =
    converterParaCampoData(aviso.inicio);
  if (aviso.fim) {
    document.getElementById("fim").value = converterParaCampoData(aviso.fim);
    document.getElementById("semFim").checked = false;
    document.getElementById("fim").disabled = false;
    document.getElementById("fim").setAttribute("required", "required");
  } else {
    document.getElementById("fim").value = "";
    document.getElementById("semFim").checked = true;
    document.getElementById("fim").disabled = true;
    document.getElementById("fim").removeAttribute("required");
  }
  document.getElementById("link").value = aviso.link || "";
  document.getElementById("mostrarPopup").checked =
    aviso.mostrarPopup;
  document.getElementById("mostrarAvisosGerais").checked =
    aviso.mostrarAvisosGerais;
  document.getElementById("piscar").checked = aviso.piscar;
  document.getElementById("ativo").checked = aviso.ativo;

  tituloFormulario.textContent = "Editar aviso";
  cancelarEdicao.hidden = false;

  document.getElementById("categoria").dispatchEvent(new Event("change"));

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

window.excluirAviso = function(id) {
  const aviso = avisos.find((a) => a.id === id);
  if (!aviso) return;

  const confirmou = confirm(
    `Deseja excluir o aviso "${aviso.titulo}"?`
  );

  if (!confirmou) {
    return;
  }

  avisos = avisos.filter((a) => a.id !== id);

  if (idEmEdicao === id) {
    limparFormulario();
  }

  renderizarAvisos();
  salvarAvisosNoServidor(true); // Auto-save silencioso
}

function limparFormulario() {
  idEmEdicao = null;
  document.getElementById("avisoId").value = "";
  document.getElementById("resumo").value = "";
  document.getElementById("imagem").value = "";
  imagemBase64 = "";
  document.getElementById("previewImagem").style.display = "none";

  const agora = new Date();
  agora.setMinutes(agora.getMinutes() - agora.getTimezoneOffset());
  document.getElementById("inicio").value = agora.toISOString().slice(0, 16);

  document.getElementById("semFim").checked = false;
  document.getElementById("fim").disabled = false;
  document.getElementById("fim").setAttribute("required", "required");
  document.getElementById("fim").value = "";

  tituloFormulario.textContent = "Novo aviso";
  cancelarEdicao.hidden = true;
  document.getElementById("categoria").dispatchEvent(new Event("change"));
}

cancelarEdicao.addEventListener("click", limparFormulario);

async function salvarAvisosNoServidor(silencioso = false) {
  try {
    salvarArquivo.disabled = true;
    salvarArquivo.textContent = "Salvando...";

    const resposta = await fetch("/api/avisos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(avisos)
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        resultado.erro || "Não foi possível salvar."
      );
    }

    statusServidor.textContent = "Arquivo salvo com sucesso";
    statusServidor.className = "status sucesso";

    if (!silencioso) {
      alert("Os avisos foram salvos e um backup foi criado.");
    }
  } catch (erro) {
    statusServidor.textContent = erro.message;
    statusServidor.className = "status erro";
  } finally {
    salvarArquivo.disabled = false;
    salvarArquivo.textContent = "Salvar avisos.json";
  }
}

salvarArquivo.addEventListener("click", () => salvarAvisosNoServidor(false));

function removerAvisosExpirados() {
  const agora = new Date();
  const tamanhoAnterior = avisos.length;
  
  avisos = avisos.filter(a => {
    if (!a.fim || String(a.fim).trim() === "" || String(a.fim) === "null") return true;
    
    const dataFim = new Date(a.fim);
    // Se a data for inválida por algum motivo bizarro de navegador, não exclui!
    if (isNaN(dataFim.getTime())) return true;
    
    return dataFim > agora;
  });
  
  if (avisos.length !== tamanhoAnterior) {
    if (idEmEdicao !== null && !avisos.some(a => a.id === idEmEdicao)) {
      limparFormulario();
    }
    renderizarAvisos();
    salvarAvisosNoServidor(true);
  }
}

carregarAvisos();
window.setInterval(removerAvisosExpirados, 60000);

document.getElementById("categoria").addEventListener("change", (e) => {
  const categoria = e.target.value;
  const mostrarTempo = ["curso", "evento", "manutencao"].includes(categoria);
  const grupoEncerramento = document.getElementById("grupoEncerramento");
  
  if (mostrarTempo) {
    grupoEncerramento.style.display = "flex"; // or block depending on CSS, it's a div class="campo" which is usually flex col
  } else {
    grupoEncerramento.style.display = "none";
    document.getElementById("semFim").checked = true;
    document.getElementById("fim").disabled = true;
    document.getElementById("fim").removeAttribute("required");
  }
});
// Run once on load to set initial state
document.getElementById("categoria").dispatchEvent(new Event("change"));

// ==========================================
// Lógica da Tela de Login / Bloqueio
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
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
        const INACTIVITY_LIMIT = 3 * 60 * 1000; // 3 min ausente
        const ABSOLUTE_LIMIT = 6 * 60 * 1000; // 6 min mexendo

        const isLocalHost = (function() {
            try {
                const proto = window.location.protocol;
                const host = window.location.hostname;
                return proto === 'file:' || 
                       host === 'localhost' || 
                       host === '127.0.0.1' || 
                       host === '' || 
                       host.endsWith('.local') || 
                       host.startsWith('192.168.') || 
                       host.startsWith('10.');
            } catch (e) {
                return false;
            }
        })();

        let isUnlocked = false;

        function lockScreen(animate = true) {
            if (isLocalHost) return;
            isUnlocked = false;
            sessionStorage.removeItem('cbm_auth_unlocked');
            sessionStorage.removeItem('cbm_session_start');
            sessionStorage.removeItem('cbm_last_activity');
            document.documentElement.classList.remove('cbm-unlocked');

            // Remove o cookie
            document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

            if (loginScreen) {
                loginScreen.style.display = 'flex';
                if (animate) {
                    setTimeout(() => {
                        loginScreen.style.opacity = '1';
                        loginScreen.style.visibility = 'visible';
                    }, 10);
                } else {
                    loginScreen.style.opacity = '1';
                    loginScreen.style.visibility = 'visible';
                }
            }
            document.body.classList.add('locked');
            const digitalClock = document.getElementById('digital-clock');
            if (digitalClock) digitalClock.style.display = 'none';
            if (loginPassword) loginPassword.value = '';
            if (loginError) loginError.style.display = 'none';
            stopTimers();
        }

        function startTimers(customInactivityMs, customAbsoluteMs) {
            stopTimers();
            if (isLocalHost) return;
            const inactMs = (typeof customInactivityMs === 'number') ? customInactivityMs : INACTIVITY_LIMIT;
            const absMs = (typeof customAbsoluteMs === 'number') ? customAbsoluteMs : ABSOLUTE_LIMIT;

            inactivityTimer = setTimeout(() => lockScreen(true), inactMs);
            absoluteTimer = setTimeout(() => lockScreen(true), absMs);
        }

        function stopTimers() {
            clearTimeout(inactivityTimer);
            clearTimeout(absoluteTimer);
        }

        function resetInactivityTimer() {
            if (isLocalHost) return;
            if (isUnlocked) {
                const now = Date.now();
                const sessionStart = parseInt(sessionStorage.getItem('cbm_session_start') || '0', 10);
                
                // Se ultrapassou o limite absoluto de 6 minutos, bloqueia imediatamente
                if (sessionStart > 0 && (now - sessionStart >= ABSOLUTE_LIMIT)) {
                    lockScreen(true);
                    return;
                }

                clearTimeout(inactivityTimer);
                inactivityTimer = setTimeout(() => lockScreen(true), INACTIVITY_LIMIT);
                sessionStorage.setItem('cbm_last_activity', now.toString());
            }
        }

        ['mousemove', 'mousedown', 'keypress', 'touchmove', 'scroll'].forEach(evt => 
            document.addEventListener(evt, resetInactivityTimer)
        );

        const urlParams = new URLSearchParams(window.location.search);
        const isLoginSuccess = urlParams.get('login') === 'success';

        if (isLoginSuccess) {
            // Remove o parâmetro da URL sem recarregar a página
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
            
            // Marca a sessão como ativa
            const now = Date.now();
            sessionStorage.setItem('cbm_auth_unlocked', 'true');
            sessionStorage.setItem('cbm_session_start', now.toString());
            sessionStorage.setItem('cbm_last_activity', now.toString());
        }

        // Validação da Sessão (F5 na mesma aba preserva sessionStorage; fechar aba apaga)
        const isSessionStored = sessionStorage.getItem('cbm_auth_unlocked') === 'true';
        const sessionStart = parseInt(sessionStorage.getItem('cbm_session_start') || '0', 10);
        const lastActivity = parseInt(sessionStorage.getItem('cbm_last_activity') || '0', 10);
        const now = Date.now();

        const timeSinceStart = sessionStart > 0 ? (now - sessionStart) : Infinity;
        const timeSinceActivity = lastActivity > 0 ? (now - lastActivity) : Infinity;

        const isSessionValid = isSessionStored && 
                               (timeSinceStart < ABSOLUTE_LIMIT) && 
                               (timeSinceActivity < INACTIVITY_LIMIT);

        if (isLocalHost) {
            // Em ambiente local, desbloqueia imediatamente e sem senha
            isUnlocked = true;
            document.documentElement.classList.add('cbm-unlocked');
            if (loginScreen) {
                loginScreen.style.display = 'none';
                loginScreen.style.opacity = '0';
                loginScreen.style.visibility = 'hidden';
            }
            document.body.classList.remove('locked');
            const digitalClock = document.getElementById('digital-clock');
            if (digitalClock) digitalClock.style.display = 'block';
        } else if (isSessionValid) {
            // Inicia desbloqueado (mantido no F5 / Refresh)
            isUnlocked = true;
            document.documentElement.classList.add('cbm-unlocked');
            if (loginScreen) {
                loginScreen.style.display = 'none';
                loginScreen.style.opacity = '0';
                loginScreen.style.visibility = 'hidden';
            }
            document.body.classList.remove('locked');
            const digitalClock = document.getElementById('digital-clock');
            if (digitalClock) digitalClock.style.display = 'block';

            // Retoma os temporizadores com o tempo restante
            const remainingInactivity = Math.max(1000, INACTIVITY_LIMIT - timeSinceActivity);
            const remainingAbsolute = Math.max(1000, ABSOLUTE_LIMIT - timeSinceStart);
            startTimers(remainingInactivity, remainingAbsolute);
        } else {
            // Inicia bloqueado (nova aba ou tempo esgotado)
            lockScreen(false);
        }

        function unlockApp() {
            isUnlocked = true;
            const now = Date.now();
            sessionStorage.setItem('cbm_auth_unlocked', 'true');
            sessionStorage.setItem('cbm_session_start', now.toString());
            sessionStorage.setItem('cbm_last_activity', now.toString());
            document.documentElement.classList.add('cbm-unlocked');

            if (loginError) loginError.style.display = 'none';
            if (loginScreen) {
                loginScreen.style.opacity = '0';
                setTimeout(() => {
                    loginScreen.style.display = 'none';
                    loginScreen.style.visibility = 'hidden';
                    document.body.classList.remove('locked');
                    const digitalClock = document.getElementById('digital-clock');
                    if (digitalClock) digitalClock.style.display = 'block';
                    if (!isLocalHost) startTimers();
                    const btn = document.getElementById('login-submit');
                    if (btn) btn.disabled = false;
                }, 500);
            } else {
                document.body.classList.remove('locked');
                const digitalClock = document.getElementById('digital-clock');
                if (digitalClock) digitalClock.style.display = 'block';
                if (!isLocalHost) startTimers();
                const btn = document.getElementById('login-submit');
                if (btn) btn.disabled = false;
            }
        }

        async function handleLogin() {
            if (isLocalHost) {
                unlockApp();
                return;
            }
            const btn = document.getElementById('login-submit');
            if (btn) btn.disabled = true;
            try {
                const response = await fetch('/api/auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: loginPassword.value })
                });

                if (response.ok) {
                    unlockApp();
                } else {
                    // Senha Incorreta
                    loginError.textContent = "Senha incorreta. Tente novamente.";
                    loginError.style.display = 'block';
                    loginPassword.value = '';
                    loginPassword.focus();
                    if (btn) btn.disabled = false;
                }
            } catch (error) {
                console.error("Erro na autenticação:", error);
                // Fallback de contingência local se a API não estiver respondendo
                if (loginPassword.value.trim().toUpperCase() === 'HONRA') {
                    unlockApp();
                } else {
                    loginError.textContent = "Erro ao conectar com o servidor.";
                    loginError.style.display = 'block';
                    if (btn) btn.disabled = false;
                }
            }
        }

        if (loginSubmit) loginSubmit.addEventListener('click', handleLogin);
        if (loginPassword) loginPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                // Evita que o 'Enter' envie o form do painel acidentalmente
                e.preventDefault(); 
                handleLogin();
            }
        });
    }
});
