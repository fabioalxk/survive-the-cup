---
name: gerar-imagem
description: Gera imagens usando a API do ChatGPT (OpenAI) com o modelo gpt-image-2. Use quando o usuário pedir para gerar, criar ou desenhar uma imagem (ex. sprites, retratos, ícones, backgrounds para o jogo).
---

# Gerar Imagem (ChatGPT / gpt-image-2)

Este repositório tem acesso à API do ChatGPT (OpenAI). A API key está no arquivo `.env` na raiz do projeto, na variável `CHATPGPT_API_KEY` (atenção à grafia — é exatamente assim que está no `.env`).

## Como gerar uma imagem

1. Leia a key do `.env` (variável `CHATPGPT_API_KEY`). **Nunca** imprima o valor da key no chat, em logs ou em commits.
2. Use o modelo **`gpt-image-2`** no endpoint de geração de imagens da OpenAI:

```bash
curl -s https://api.openai.com/v1/images/generations \
  -H "Authorization: Bearer $CHATPGPT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-image-2",
    "prompt": "<descrição da imagem>",
    "size": "1024x1024"
  }'
```

3. A resposta traz a imagem em base64 (`data[0].b64_json`). Decodifique e salve como arquivo (ex. `.png`) no local apropriado do projeto — imagens do jogo ficam junto dos demais assets já existentes no repositório.

## Regras

- Modelo de imagem: sempre `gpt-image-2`.
- A key vem sempre do `.env` — nunca hardcode a key em código ou scripts commitados.
- Para scripts Node, carregue o `.env` e use `process.env.CHATPGPT_API_KEY`.
