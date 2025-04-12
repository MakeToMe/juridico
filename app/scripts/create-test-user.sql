-- Insere um usuário de teste na tabela alnpp.usuarios
-- Substitua os valores conforme necessário.

-- IMPORTANTE: A senha 'senha123' está em texto plano neste script.
-- A lógica de criptografia/hashing será implementada na API de login/cadastro
-- usando a ENCRYPTION_KEY definida no .env.local.
-- Após implementar a criptografia, você pode querer atualizar esta senha manualmente
-- ou criar usuários apenas através da API.

INSERT INTO alnpp.usuarios (nome, email, senha, role)
VALUES 
  ('Usuário Teste', 'teste@example.com', 'senha123', 'user')
ON CONFLICT (email) DO NOTHING; -- Evita erro se o email já existir

-- Opcional: Descomente a linha abaixo para verificar se o usuário foi inserido
-- SELECT * FROM alnpp.usuarios WHERE email = 'teste@example.com';
