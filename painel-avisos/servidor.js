const express = require("express");
const fs = require("node:fs");
const path = require("node:path");
const { exec } = require("node:child_process");

const app = express();
const PORTA = 3001;

const PASTA_PROJETO = path.resolve(__dirname, "..");

const ARQUIVO_AVISOS = path.join(
  PASTA_PROJETO,
  "public",
  "dados",
  "avisos.json"
);

const PASTA_BACKUPS = path.join(
  PASTA_PROJETO,
  "backups-avisos"
);

app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(
  express.static(path.join(__dirname))
);

app.use(
  "/assets",
  express.static(path.join(PASTA_PROJETO, "assets"))
);

function garantirEstrutura() {
  const pastaDados = path.dirname(ARQUIVO_AVISOS);

  if (!fs.existsSync(pastaDados)) {
    fs.mkdirSync(pastaDados, { recursive: true });
  }

  if (!fs.existsSync(PASTA_BACKUPS)) {
    fs.mkdirSync(PASTA_BACKUPS, { recursive: true });
  }

  if (!fs.existsSync(ARQUIVO_AVISOS)) {
    fs.writeFileSync(
      ARQUIVO_AVISOS,
      JSON.stringify([], null, 2),
      "utf8"
    );
  }
}

function lerAvisos() {
  garantirEstrutura();

  const conteudo = fs.readFileSync(
    ARQUIVO_AVISOS,
    "utf8"
  );

  const avisos = JSON.parse(conteudo);

  if (!Array.isArray(avisos)) {
    throw new Error(
      "O arquivo avisos.json precisa conter um array."
    );
  }

  return avisos;
}

function criarBackup() {
  garantirEstrutura();

  if (!fs.existsSync(ARQUIVO_AVISOS)) {
    return;
  }

  const destino = path.join(
    PASTA_BACKUPS,
    "avisos.json"
  );

  fs.copyFileSync(ARQUIVO_AVISOS, destino);
}

function salvarAvisos(avisos) {
  if (!Array.isArray(avisos)) {
    throw new Error("A lista de avisos é inválida.");
  }

  fs.writeFileSync(
    ARQUIVO_AVISOS,
    JSON.stringify(avisos, null, 2),
    "utf8"
  );

  criarBackup();
}

app.get("/api/avisos", (req, res) => {
  const gitPath = '"C:\\Program Files\\Git\\cmd\\git.exe"';
  exec(`${gitPath} pull origin main`, { cwd: PASTA_PROJETO }, (error, stdout, stderr) => {
    try {
      res.json(lerAvisos());
    } catch (erro) {
      res.status(500).json({
        erro: erro.message
      });
    }
  });
});

app.post("/api/avisos", (req, res) => {
  try {
    salvarAvisos(req.body);

    const gitPath = '"C:\\Program Files\\Git\\cmd\\git.exe"';
    const comandos = `${gitPath} pull origin main && ${gitPath} add . && ${gitPath} commit -m "Atualizacao de avisos pelo painel" && ${gitPath} push origin main`;
    
    exec(comandos, { cwd: PASTA_PROJETO }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Erro ao enviar para o GitHub: ${error.message}`);
      } else {
        console.log(`Enviado com sucesso:\n${stdout}`);
      }
    });

    res.json({
      sucesso: true,
      mensagem: "Arquivo avisos.json atualizado e enviado para o GitHub!"
    });
  } catch (erro) {
    console.error("Erro no POST /api/avisos:", erro);
    res.status(400).json({
      sucesso: false,
      erro: erro.message
    });
  }
});

app.post("/api/auth", (req, res) => {
  try {
    const { password } = req.body;
    
    // Senha padrão local (pode ser "HONRA" ou aceitar qualquer uma se for isLocal, mas vamos exigir "HONRA" para consistência)
    const MASTER_PASSWORD = process.env.MASTER_PASSWORD || "HONRA";

    if (password === MASTER_PASSWORD) {
      res.setHeader("Set-Cookie", "auth_token=autenticado_com_sucesso; Path=/; Max-Age=604800; SameSite=Lax");
      res.status(200).json({ sucesso: true, mensagem: "Autenticado com sucesso" });
    } else {
      res.status(401).json({ sucesso: false, erro: "Senha incorreta." });
    }
  } catch (erro) {
    res.status(500).json({ erro: "Erro interno no servidor local." });
  }
});

app.listen(PORTA, "127.0.0.1", () => {
  garantirEstrutura();

  console.log("");
  console.log("Painel de avisos iniciado.");
  console.log(`Acesse: http://localhost:${PORTA}`);
  console.log("");
});
