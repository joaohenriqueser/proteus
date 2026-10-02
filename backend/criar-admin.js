const db = require('./db');
const bcrypt = require('bcryptjs');

async function criarPrimeiroAdmin() {
    const nome = 'Administrador PROTEUS';
    const usuario = 'admin';
    const email = 'admin@proteus.com';
    const senhaPura = 'Proteus@2026';

    try {
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senhaPura, salt);

        const sql = `
        INSERT INTO usuarios_admin (nome, usuario, email, senha_hash) 
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (email) DO NOTHING
        RETURNING id, nome, usuario, email;
    `;

        const { rows } = await db.query(sql, [nome, usuario, email, senhaHash]);

        if (rows.length > 0) {
            console.log('Administrador criado com sucesso!');
            console.log(`Usuário: @${usuario}`);
            console.log(`Email: ${email}`);
            console.log(`Senha: ${senhaPura}`);
            console.log(`Hash gerado no banco: ${senhaHash.substring(0, 20)}...`);
        } else {
            console.log(`O usuário já existe no banco de dados.`)
        }
    } catch (err) {
        console.error('Erro ao criar administrador:', err);
    } finally {
        process.exit(0);
    }
}

criarPrimeiroAdmin();