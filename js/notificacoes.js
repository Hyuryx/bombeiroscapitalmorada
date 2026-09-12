async function fetchAvisosData() {
  let avisos = null;
  if (window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    try {
      const resLocal = await fetch('http://localhost:3001/api/avisos');
      if (resLocal.ok) {
        avisos = await resLocal.json();
      }
    } catch (e) {
      // Ignora erro e tenta buscar o arquivo local
    }
  }

  if (!avisos) {
    try {
      const respostaApi = await fetch(`/api/avisos`);
      if (respostaApi.ok) {
        avisos = await respostaApi.json();
      }
    } catch (e) {
      // Ignora erro da API
    }
  }

  if (!avisos) {
    throw new Error(`Erro ao carregar avisos via API`);
  }

  if (!Array.isArray(avisos)) {
    throw new Error("O conteúdo de avisos é inválido.");
  }

  return avisos;
}

(() => {
  const INTERVALO_ATUALIZACAO = 60_000;

  const prioridades = {
    urgente: 1,
    importante: 2,
    normal: 3
  };

  let container = null;

  function escaparHtml(valor = "") {
    return String(valor)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function obterContainer() {
    if (container) {
      return container;
    }

    container = document.createElement("aside");
    container.id = "central-notificacoes";
    container.setAttribute(
      "aria-label",
      "Avisos importantes"
    );

    document.body.appendChild(container);

    return container;
  }

  function estaAtivo(aviso, agora) {
    if (!aviso.ativo || !aviso.mostrarPopup) {
      return false;
    }

    const inicio = new Date(aviso.inicio);

    if (Number.isNaN(inicio.getTime())) {
      return false;
    }

    if (aviso.fim && String(aviso.fim).trim() !== "" && String(aviso.fim) !== "null") {
      const fim = new Date(aviso.fim);
      if (Number.isNaN(fim.getTime())) return true; // keep if invalid
      return agora >= inicio && agora < fim;
    }
    
    return agora >= inicio;
  }

  function formatarEncerramento(valor) {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Sao_Paulo"
    }).format(new Date(valor));
  }

  function obterAvisosFechados() {
    try {
      const salvos = localStorage.getItem('avisosFechados');
      return salvos ? new Set(JSON.parse(salvos)) : new Set();
    } catch (e) {
      return new Set();
    }
  }

  const avisosFechados = obterAvisosFechados();

  function salvarAvisoFechado(id) {
    avisosFechados.add(id);
    try {
      localStorage.setItem('avisosFechados', JSON.stringify([...avisosFechados]));
    } catch (e) {}
  }

  function montarAviso(aviso) {
    const elemento = document.createElement("article");

    elemento.className = [
      "notificacao-site",
      `notificacao-${aviso.prioridade}`,
      aviso.piscar ? "notificacao-destaque" : ""
    ]
      .filter(Boolean)
      .join(" ");

    elemento.dataset.avisoId = aviso.id;

    elemento.innerHTML = `
      <button
        type="button"
        class="notificacao-fechar"
        aria-label="Fechar aviso"
      >
        ×
      </button>

      <div class="notificacao-cabecalho">
        <span class="notificacao-categoria">
          ${escaparHtml(aviso.categoria)}
        </span>

        <span class="notificacao-prioridade">
          ${escaparHtml(aviso.prioridade)}
        </span>
      </div>

      <h2>${escaparHtml(aviso.titulo)}</h2>

      <p>${formatarTextoMarkdown(aviso.resumo || aviso.descricao)}</p>

      ${["curso", "evento", "manutencao"].includes(aviso.categoria) && aviso.fim ? `
      <div class="notificacao-rodape" style="display: flex; justify-content: space-between; align-items: center;">
        <small>
          Disponível até ${formatarEncerramento(aviso.fim)}
        </small>
        <small class="cronometro-aviso" data-fim="${aviso.fim}" style="font-weight: bold;"></small>
      </div>
      ` : ''}
    `;

    // Se já foi fechado antes pelo usuário, mantem escondido
    if (avisosFechados.has(aviso.id)) {
      elemento.style.display = "none";
    }

    elemento
      .querySelector(".notificacao-fechar")
      .addEventListener("click", () => {
        elemento.style.display = "none";
        salvarAvisoFechado(aviso.id); // Registra que o usuário fechou e salva no localStorage
      });

    return elemento;
  }

  function renderizar(avisos) {
    const central = obterContainer();

    // Mantem apenas os elementos novos, atualizando o html
    central.innerHTML = "";

    avisos.forEach((aviso) => {
      central.appendChild(montarAviso(aviso));
    });

    // Se todos estiverem escondidos (display: none), esconde o central
    const todosEscondidos = Array.from(central.children).every(el => el.style.display === 'none');
    central.hidden = (avisos.length === 0 || todosEscondidos);
  }

  async function carregarAvisos() {
    try {
      const avisos = await fetchAvisosData();

      const agora = new Date();

      const ativos = avisos
        .filter((aviso) => estaAtivo(aviso, agora))
        .sort((a, b) => {
          return (
            (prioridades[a.prioridade] || 99) -
            (prioridades[b.prioridade] || 99)
          );
        });

      renderizar(ativos);
    } catch (erro) {
      console.error(erro);

      if (container) {
        container.hidden = true;
      }
    }
  }

  function atualizarCronometros() {
    const cronometros = document.querySelectorAll('.cronometro-aviso');
    const agora = new Date().getTime();

    cronometros.forEach(cron => {
      const fim = new Date(cron.dataset.fim).getTime();
      const diff = fim - agora;

      if (diff <= 0) {
        const notificacao = cron.closest('.notificacao-site, .aviso-geral, .aviso-curso-banner');
        if (notificacao && notificacao.style.display !== 'none') {
          notificacao.style.display = 'none';
          if (notificacao.classList.contains('notificacao-site')) {
            const central = obterContainer();
            const todosEscondidos = Array.from(central.children).every(el => el.style.display === 'none');
            central.hidden = todosEscondidos;
          }
        }
      } else {
        const totalHoras = Math.floor(diff / (1000 * 60 * 60));
        const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (totalHoras >= 24) {
          const dias = Math.floor(totalHoras / 24);
          const horasRestantes = totalHoras % 24;
          const textoDias = dias === 1 ? "1 dia" : `${dias} dias`;
          
          cron.textContent = `${textoDias} ${horasRestantes.toString().padStart(2, '0')}h ${minutos.toString().padStart(2, '0')}m`;
        } else {
          const segundos = Math.floor((diff % (1000 * 60)) / 1000);
          cron.textContent = `${totalHoras.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
        }
      }
    });
  }

  function iniciar() {
    carregarAvisos();

    window.setInterval(
      carregarAvisos,
      INTERVALO_ATUALIZACAO
    );

    window.setInterval(atualizarCronometros, 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();

async function carregarAvisosGerais() {
  const container = document.getElementById(
    "lista-avisos-gerais"
  );

  if (!container) return;

  try {
    const avisos = await fetchAvisosData();
    const agora = new Date();

    const avisosGerais = avisos
      .filter((aviso) => {
        const inicio = new Date(aviso.inicio);
        
        let isValidFim = false;
        let expired = false;
        if (aviso.fim && String(aviso.fim).trim() !== "" && String(aviso.fim) !== "null") {
          const fim = new Date(aviso.fim);
          if (!Number.isNaN(fim.getTime())) {
            isValidFim = true;
            expired = agora >= fim;
          }
        }

        return (
          aviso.ativo &&
          aviso.mostrarAvisosGerais &&
          agora >= inicio &&
          !expired
        );
      })
      .sort((a, b) => {
        return new Date(b.inicio) - new Date(a.inicio);
      });

    if (avisosGerais.length === 0) {
      container.innerHTML = `
        <p>Nenhum aviso disponível no momento.</p>
      `;

      return;
    }

    window.avisosData = avisosGerais; // Store globally for the modal

    container.innerHTML = avisosGerais
      .map((aviso, index) => {
        const temFim = aviso.fim && String(aviso.fim).trim() !== "" && String(aviso.fim) !== "null";
        return `
          <article class="aviso-geral prioridade-${aviso.prioridade}" onclick="abrirModalAviso(${index})">
            ${temFim ? `<span class="cronometro-aviso" data-fim="${aviso.fim}" style="display:none;"></span>` : ''}
            <span class="aviso-badge">${aviso.categoria}</span>
            <h3>${aviso.titulo}</h3>
          </article>
        `;
      })
      .join("");
  } catch (erro) {
    console.error("Erro ao carregar avisos gerais:", erro);
  }
}

function abrirModalAviso(index) {
  const aviso = window.avisosData[index];
  if (!aviso) return;

  let modal = document.getElementById("modal-aviso-geral");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modal-aviso-geral";
    document.body.appendChild(modal);
  }

  const formatarDataModal = (valor) => {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Sao_Paulo"
    }).format(new Date(valor));
  };

  const linkHTML = aviso.link 
    ? `<a href="${aviso.link}" class="modal-aviso-link" target="_blank">Acessar Link</a>` 
    : `<a class="modal-aviso-link inativo">Acessar Link</a>`;
    
  const imagemHTML = aviso.imagem
    ? `<img src="${aviso.imagem}" alt="Imagem do Aviso" style="width: 100%; max-height: 400px; object-fit: contain; border-radius: 8px; margin: 15px 0;">`
    : "";

  modal.innerHTML = `
    <div class="modal-aviso-conteudo">
      <button class="modal-aviso-fechar" onclick="document.getElementById('modal-aviso-geral').style.display='none'">×</button>
      <h2>${aviso.titulo}</h2>
      <div class="modal-aviso-badges">
        <span class="aviso-badge">${aviso.categoria}</span>
        <span class="aviso-badge prioridade-${aviso.prioridade}">${aviso.prioridade}</span>
      </div>
      ${imagemHTML}
      ${aviso.resumo ? `<p class="modal-aviso-resumo" style="font-weight: bold; margin-bottom: 10px; white-space: pre-wrap;">${formatarTextoMarkdown(aviso.resumo)}</p>` : ''}
      <p class="modal-aviso-desc">${formatarTextoMarkdown(aviso.descricao)}</p>
      <div class="modal-aviso-datas">
        <p><strong>Início:</strong> ${formatarDataModal(aviso.inicio)}</p>
        ${["curso", "evento", "manutencao"].includes(aviso.categoria) && aviso.fim ? `
        <p><strong>Encerramento:</strong> ${formatarDataModal(aviso.fim)}</p>
        ` : ''}</div>
      ${linkHTML}
    </div>
  `;

  modal.style.display = "flex";
}

// Ensure carregarAvisosGerais runs when DOM is loaded, and also whenever #view-avisos is shown
document.addEventListener('DOMContentLoaded', () => {
  carregarAvisosGerais();
  carregarAvisosCursos();

  // Silent refresh das abas também
  window.setInterval(() => {
    carregarAvisosGerais();
    carregarAvisosCursos();
  }, 30000);
});

async function carregarAvisosCursos() {
  try {
    const avisos = await fetchAvisosData();
    const agora = new Date();

    const avisosAtivos = avisos.filter((aviso) => {
      const inicio = new Date(aviso.inicio);
      if (aviso.fim && String(aviso.fim).trim() !== "" && String(aviso.fim) !== "null") {
        const dataFim = new Date(aviso.fim);
        if (!isNaN(dataFim.getTime())) {
          return aviso.ativo && agora >= inicio && agora < dataFim;
        }
      }
      return aviso.ativo && agora >= inicio;
    });

    const mapaAbas = {
      "Curso de Piloto": { id: "curso-aereo", selector: ".sidebar-nav li[data-target='curso-aereo']" },
      "Resgate Aquático": { id: "curso-aquatico", selector: ".sidebar-nav li[data-target='curso-aquatico']" },
      "Resgate Montanha": { id: "curso-montanha", selector: ".sidebar-nav li[data-target='curso-montanha']" },
      "Paraquedismo": { id: "curso-paraquedismo", selector: ".sidebar-nav li[data-target='curso-paraquedismo']" },
      "Evoluir": { id: "curso-evoluir", selector: ".sidebar-nav li[data-target='curso-evoluir']" },
      "Início": { id: "view-inicio", selector: ".nav-item[data-global-target='view-inicio']" },
      "Avisos Gerais": { id: "view-avisos", selector: ".nav-item[data-global-target='view-avisos']" },
      "Regras": { id: "view-regras", selector: ".nav-item[data-global-target='view-regras']" },
      "Uniformes": { id: "view-uniformes", selector: ".nav-item[data-global-target='view-uniformes']" },
      "Cursos": { id: "view-cursos", selector: ".nav-item[data-global-target='view-cursos']" },
      "Modulação": { id: "view-modulacao", selector: ".nav-item[data-global-target='view-modulacao']" },
      "Viaturas": { id: "view-viaturas", selector: ".nav-item[data-global-target='view-viaturas']" },
      "Hierarquia": { id: "view-hierarquia", selector: ".nav-item[data-global-target='view-hierarquia']" },
      "Planilhas": { id: "view-planilhas", selector: ".nav-item[data-global-target='view-planilhas']" },
      "Galeria": { id: "view-galeria", selector: ".nav-item[data-global-target='view-galeria']" }
    };

    // Reset current notifications
    Object.values(mapaAbas).forEach(aba => {
      const el = document.getElementById(aba.id);
      if(el) {
        const notif = el.querySelector('.aviso-curso-banner');
        if(notif) notif.remove();
      }
      const navItem = document.querySelector(aba.selector);
      if(navItem) navItem.classList.remove('tem-aviso');
    });

    // Add new notifications
    avisosAtivos.forEach(aviso => {
      if (mapaAbas[aviso.titulo]) {
        const aba = mapaAbas[aviso.titulo];
        const el = document.getElementById(aba.id);
        if(el && !el.querySelector('.aviso-curso-banner')) {
          const temFim = aviso.fim && String(aviso.fim).trim() !== "" && String(aviso.fim) !== "null";
          const isCurso = ["Curso de Piloto", "Resgate Aquático", "Resgate Montanha", "Paraquedismo", "Evoluir"].includes(aviso.titulo);
          const tituloBanner = isCurso 
            ? "Há um aviso ativo para este curso. Veja a aba Avisos Gerais." 
            : "Há um aviso ativo para esta categoria.";
            
          const banner = document.createElement('div');
          banner.className = 'aviso-curso-banner';
          banner.innerHTML = `
            ${temFim ? `<span class="cronometro-aviso" data-fim="${aviso.fim}" style="display:none;"></span>` : ''}
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <div>
              <strong>Atenção:</strong> ${tituloBanner} <br>
              <span style="font-size: 0.85em; opacity: 0.9;">${formatarTextoMarkdown(aviso.resumo || aviso.descricao)}</span>
            </div>
          `;
          const header = el.querySelector('header') || el.querySelector('.section-header');
          if (header) {
            header.insertAdjacentElement('afterend', banner);
          } else {
            el.prepend(banner);
          }
        }
        
        const navItem = document.querySelector(aba.selector);
        if(navItem) {
          navItem.classList.add('tem-aviso');
        }
      }
      
      if (aviso.mostrarAvisosGerais) {
        const navItemGeral = document.querySelector(mapaAbas["Avisos Gerais"].selector);
        if(navItemGeral) {
          navItemGeral.classList.add('tem-aviso');
        }
      }
      
      const isCurso = ["Curso de Piloto", "Resgate Aquático", "Resgate Montanha", "Paraquedismo"].includes(aviso.titulo);
      if (isCurso) {
        const navItemCursos = document.querySelector(mapaAbas["Cursos"].selector);
        if (navItemCursos) {
          navItemCursos.classList.add('tem-aviso');
        }
      }
    });

  } catch (erro) {
    console.error("Erro ao carregar avisos de cursos:", erro);
  }
}

function escaparHtmlLocal(valor = "") {
  return String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatarTextoMarkdown(valor = "") {
  let texto = escaparHtmlLocal(valor);
  // Negrito: **texto**
  texto = texto.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Itálico: *texto* ou _texto_
  texto = texto.replace(/\*(.*?)\*/g, '<em>$1</em>');
  texto = texto.replace(/_(.*?)_/g, '<em>$1</em>');
  return texto;
}

window.addEventListener('tabChanged', async (e) => {
  const loginScreen = document.getElementById('login-screen');
  if (loginScreen && window.getComputedStyle(loginScreen).display !== 'none' && loginScreen.style.opacity !== '0') return;

  const targetId = e.detail.targetId;
  
  try {
    const avisos = await fetchAvisosData();
    const agora = new Date();

    const avisosAtivos = avisos.filter((aviso) => {
      const inicio = new Date(aviso.inicio);
      if (aviso.fim && String(aviso.fim).trim() !== "" && String(aviso.fim) !== "null") {
        const dataFim = new Date(aviso.fim);
        if (!isNaN(dataFim.getTime())) {
          return aviso.ativo && agora >= inicio && agora < dataFim;
        }
      }
      return aviso.ativo && agora >= inicio;
    });

    const mapaAbas = {
      "Curso de Piloto": { id: "curso-aereo" },
      "Resgate Aquático": { id: "curso-aquatico" },
      "Resgate Montanha": { id: "curso-montanha" },
      "Paraquedismo": { id: "curso-paraquedismo" },
      "Evoluir": { id: "curso-evoluir" },
      "Início": { id: "view-inicio" },
      "Avisos Gerais": { id: "view-avisos" },
      "Regras": { id: "view-regras" },
      "Uniformes": { id: "view-uniformes" },
      "Cursos": { id: "view-cursos" },
      "Modulação": { id: "view-modulacao" },
      "Viaturas": { id: "view-viaturas" },
      "Hierarquia": { id: "view-hierarquia" },
      "Planilhas": { id: "view-planilhas" },
      "Galeria": { id: "view-galeria" }
    };

    let avisoDestaque = null;
    
    if (targetId === "login-event") {
      for (const aviso of avisosAtivos) {
        const isCurso = ["Curso de Piloto", "Resgate Aquático", "Resgate Montanha", "Paraquedismo", "Evoluir"].includes(aviso.titulo);
        if (isCurso && aviso.imagem) {
            avisoDestaque = aviso;
            break;
        }
      }
    }



    const modalDestaque = document.getElementById('modal-destaque');
    if (modalDestaque && avisoDestaque) {
      if (targetId === 'login-event' && sessionStorage.getItem('welcomeShown') === 'true') {
        // Já mostrou o aviso nesta sessão, não mostra novamente em caso de F5
        return;
      }

      if (targetId === 'login-event') {
        sessionStorage.setItem('welcomeShown', 'true');
      }

      const imgEl = document.getElementById('modal-destaque-img');
      const textEl = document.getElementById('modal-destaque-text');
      const overlayEl = document.getElementById('modal-destaque-overlay');
      
      if (imgEl) imgEl.src = avisoDestaque.imagem;
      
      let hasText = false;
      if (textEl) {
          let conteudoText = '';
          if (avisoDestaque.resumo) {
             conteudoText += `<strong>${formatarTextoMarkdown(avisoDestaque.resumo)}</strong>\n\n`;
          }
          if (avisoDestaque.descricao) {
             conteudoText += formatarTextoMarkdown(avisoDestaque.descricao);
          }
          textEl.innerHTML = conteudoText;
          hasText = conteudoText.trim() !== '';
      }
      
      modalDestaque.style.display = 'flex';
      if (overlayEl) overlayEl.style.display = hasText ? 'block' : 'none';
    } else if (modalDestaque) {
        modalDestaque.style.display = 'none';
    }

  } catch (err) {
    console.error("Erro ao verificar destaque da aba", err);
  }
});
