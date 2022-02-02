# Ficha de RPG (Juízo Divino: Armagedom)

## Aplicativo Web feito para o RPG Juízo Divino: Armagedom

Juízo Divino RPG foi desenvolvido da seguinte forma:
  - Backend: Node.js com banco de dados MySQL.
  - Frontend: HTML, CSS, Javascript, JQuery e Bootstrap.

O sistema usa APIs de terceiros, como a Random.org, responsável por gerar números aleatórios.

As variáveis de ambiente são:
  - PORT: A porta a ser vinculada.
  - DATABASE_URL: A URL do banco de dados MySQL.
  - EXPRESS_SESSION_SECRET: Um hash ou secret para os cookies de sessão.
  - RANDOM_ORG_KEY (Opcional): A chave para uso do Random.org. Caso não exista ou seja inválida, o sistema gerará números pseudo-aleatórios.

O SQL para criar o banco de dados está nomeado como "create database.sql", e pode ser tanto executado como importado pra criar o ambiente.

## Imagens
### Login
![image](https://user-images.githubusercontent.com/71353674/152211073-1d759c9e-1a70-44ed-a48f-538ec751db8d.png)

### Register
![image](https://user-images.githubusercontent.com/71353674/152211168-a8749bb5-dc14-4119-9e9e-dbe2c84a737d.png)

### Ficha do Jogador
![localhost_3000_sheet_1](https://user-images.githubusercontent.com/71353674/152212081-71310cc4-117c-4393-8fa3-e506629797ea.png)
OBS: A página 2 da Ficha do Jogador ainda está em desenvolvimento.

### Ficha do Mestre (Administrador)
![localhost_3000_sheet_admin_1](https://user-images.githubusercontent.com/71353674/152212147-39b0ac11-608f-4541-ac21-48d3b872e6ea.png)
![localhost_3000_sheet_admin_2](https://user-images.githubusercontent.com/71353674/152212163-5e96b512-769b-4a1e-aa52-c0a760a2dd9d.png)
