module.exports = async (req, res) => {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_REPO = "Hyuryx/Bombeiros_Capital_Morada";
  const FILE_PATH = "public/dados/avisos.json";
  
  // CORS configuration
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  
  if (!GITHUB_TOKEN) {
    return res.status(500).json({ erro: "Variável GITHUB_TOKEN não configurada na Vercel." });
  }

  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}`;

  const headers = {
    "Authorization": `Bearer ${GITHUB_TOKEN}`,
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "Painel-Avisos-App"
  };

  // Auth Check para gravação de avisos:
  const cookies = req.headers.cookie || "";
  const authCookie = cookies.split(';').find(c => c.trim().startsWith('auth_token='));
  if (req.method === "POST" && !authCookie) {
    return res.status(401).json({ erro: "Acesso negado. Faça login primeiro." });
  }

  if (req.method === "GET") {
    try {
      const resposta = await fetch(url, { headers });
      if (!resposta.ok) throw new Error("Erro ao buscar dados no GitHub.");
      
      const dados = await resposta.json();
      const conteudo = Buffer.from(dados.content, "base64").toString("utf8");
      
      return res.status(200).json(JSON.parse(conteudo));
    } catch (erro) {
      return res.status(500).json({ erro: erro.message });
    }
  } 
  
  else if (req.method === "POST") {
    try {
      const novosAvisos = req.body;
      if (!Array.isArray(novosAvisos)) {
        return res.status(400).json({ erro: "A lista de avisos é inválida." });
      }

      // 1. Obter o SHA atual do arquivo principal
      const respGet = await fetch(url, { headers });
      let sha = "";
      if (respGet.ok) {
        const dadosGet = await respGet.json();
        sha = dadosGet.sha;
      }

      // 2. Preparar o novo conteúdo em Base64
      const conteudoString = JSON.stringify(novosAvisos, null, 2);
      const conteudoBase64 = Buffer.from(conteudoString, "utf8").toString("base64");

      // 3. Fazer o PUT para atualizar o arquivo principal
      const bodyPut = {
        message: "Atualizacao de avisos pelo painel (Vercel)",
        content: conteudoBase64,
        sha: sha || undefined
      };

      const respPut = await fetch(url, {
        method: "PUT",
        headers,
        body: JSON.stringify(bodyPut)
      });

      if (!respPut.ok) {
        const erroGit = await respPut.json();
        throw new Error(`Erro do GitHub: ${erroGit.message}`);
      }

      // 4. Também atualizar o backup no GitHub
      const urlBackup = `https://api.github.com/repos/${GITHUB_REPO}/contents/backups-avisos/avisos.json`;
      const respGetBackup = await fetch(urlBackup, { headers });
      let shaBackup = "";
      if (respGetBackup.ok) {
        const dadosGetBackup = await respGetBackup.json();
        shaBackup = dadosGetBackup.sha;
      }

      const bodyPutBackup = {
        message: "Backup de avisos via painel (Vercel)",
        content: conteudoBase64,
        sha: shaBackup || undefined
      };

      await fetch(urlBackup, {
        method: "PUT",
        headers,
        body: JSON.stringify(bodyPutBackup)
      });

      return res.status(200).json({
        sucesso: true,
        mensagem: "Arquivo atualizado no GitHub e deploy na Vercel iniciado!"
      });
      
    } catch (erro) {
      console.error(erro);
      return res.status(500).json({ erro: erro.message });
    }
  } 
  
  else {
    return res.status(405).json({ erro: "Método não permitido." });
  }
};
