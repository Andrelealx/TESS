const mysql = require('mysql2/promise');

async function testConnection() {
  try {
    console.log('Testando conexão com banco de dados...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL);

    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    console.log('✅ Conexão OK!');

    // Testa se tabelas existem
    const [tables] = await connection.query(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?"
    );
    console.log('Tabelas encontradas:', tables);

    await connection.end();
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

testConnection();
