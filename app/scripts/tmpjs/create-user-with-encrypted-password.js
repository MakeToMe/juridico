// Script para criar um usuário com senha criptografada
require('dotenv').config({ path: '.env.local' });
const crypto = require('crypto');

// Função de criptografia (copiada de src/lib/crypto.ts)
function encrypt(text) {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY is missing in environment variables.');
  }

  const algorithm = 'aes-256-cbc';
  const ivLength = 16;
  
  // Garante que a chave tenha 32 bytes para o algoritmo
  const keyBuffer = Buffer.alloc(32);
  keyBuffer.write(encryptionKey, 'utf-8');
  
  try {
    const iv = crypto.randomBytes(ivLength); // Gera um IV aleatório
    const cipher = crypto.createCipheriv(algorithm, keyBuffer, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted; // Concatena IV e dados criptografados
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data.');
  }
}

// Dados do usuário
const userData = {
  nome: 'Usuário Teste',
  email: 'teste@example.com',
  senha: 'senha123',
  role: 'user'
};

// Criptografar a senha
const encryptedPassword = encrypt(userData.senha);
console.log('Senha original:', userData.senha);
console.log('Senha criptografada:', encryptedPassword);

// Gerar SQL para inserir o usuário
const sql = `
-- Adicionar constraint de unicidade ao email (se ainda não existir)
alter table alnpp.usuarios
add constraint if not exists unique_email unique (email);

-- Inserir usuário com senha criptografada
insert into
  alnpp.usuarios (nome, email, senha, role)
values
  (
    '${userData.nome}',
    '${userData.email}',
    '${encryptedPassword}',
    '${userData.role}'
  )
on conflict (email) do update set
  nome = '${userData.nome}',
  senha = '${encryptedPassword}',
  role = '${userData.role}';
`;

console.log('\nSQL para inserir usuário:');
console.log(sql);
