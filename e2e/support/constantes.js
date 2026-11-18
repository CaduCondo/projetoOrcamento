const path = require('node:path');
module.exports = {
  HOJE: '2026-10-15T12:00:00-03:00',            // data fixa: "hoje" é 15/out/2026 em todos os cenários
  SENHA: 'Segredo#123',
  EMAIL_PADRAO: 'ana@exemplo.com',
  ARQUIVO_CONTA: path.join(__dirname, '..', '.estado', 'conta-nova.json'),
};
