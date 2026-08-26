

module.exports = async (req, res) => {
  // CORS configuration
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ erro: "Método não permitido." });
  }

  try {
    const { password } = req.body;
    
    // Pegar a senha do env ou usar a senha padrão "HONRA"
    const MASTER_PASSWORD = process.env.MASTER_PASSWORD || "HONRA";
    
    // Identifica se está rodando localmente pelo host
    const host = req.headers.host || "";
    const isLocal = host.includes("localhost");

    // Aceita qualquer senha no ambiente local ou verifica a senha correta em produção
    if (isLocal || password === MASTER_PASSWORD) {
      // Se a senha estiver correta, criamos um cookie seguro
      // HttpOnly: O JS do navegador não consegue ler (protege contra roubo via XSS)
      // Path=/: Vale para o site todo (inclusive para /api/avisos)
      // Max-Age: Duração da sessão (ex: 7 dias)
      res.setHeader("Set-Cookie", "auth_token=autenticado_com_sucesso; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax");
      
      return res.status(200).json({ sucesso: true, mensagem: "Autenticado com sucesso" });
    } else {
      return res.status(401).json({ sucesso: false, erro: "Senha incorreta." });
    }
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: "Erro interno no servidor." });
  }
};
