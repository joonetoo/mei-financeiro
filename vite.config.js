import { defineConfig } from "vite";
import fs from "fs";
import path from "path";

// `vite build --mode beta` gera a versão de teste: outro nome no ícone e na
// aba do navegador, pra nunca confundir com o app de verdade.
function nomeBeta(mode) {
  return {
    name: "nome-beta",
    transformIndexHtml(html) {
      return mode === "beta"
        ? html.replace(/<title>.*?<\/title>/, "<title>Ritmo BETA</title>")
              .replace(/(name="apple-mobile-web-app-title" content=")[^"]*"/, '$1Ritmo BETA"')
        : html;
    },
    closeBundle() {
      if (mode !== "beta") return;
      const p = path.resolve("dist/manifest.json");
      if (!fs.existsSync(p)) return;
      const m = JSON.parse(fs.readFileSync(p, "utf8"));
      m.name = "Ritmo BETA";
      m.short_name = "Ritmo BETA";
      m.description = "Versão de teste do Ritmo — os dados daqui são uma cópia";
      fs.writeFileSync(p, JSON.stringify(m, null, 2));
    },
  };
}

// O gerador de PDF (jsPDF) fica num arquivo separado, baixado só quando se
// pede um PDF. Aqui a página ganha um aviso de "pode ir buscando com calma"
// (prefetch) pra esses arquivos separados: não atrasa a abertura e, de quebra,
// o service worker (public/sw.js) enxerga o endereço e guarda o arquivo junto
// com o esqueleto — é o que mantém o PDF funcionando sem internet.
function avisarArquivosSeparados() {
  return {
    name: "avisar-arquivos-separados",
    transformIndexHtml: {
      order: "post",
      handler(html, ctx) {
        if (!ctx.bundle) return html;
        return Object.values(ctx.bundle)
          .filter((c) => c.type === "chunk" && !c.isEntry && !html.includes(c.fileName))
          .map((c) => ({
            tag: "link",
            attrs: { rel: "prefetch", as: "script", crossorigin: true, href: "./" + c.fileName },
            injectTo: "head",
          }));
      },
    },
  };
}

export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: [nomeBeta(mode), avisarArquivosSeparados()],
  resolve: {
    alias: {
      // a versão "módulo" do jspdf-autotable (o pacote só anuncia a outra)
      "jspdf-autotable": path.resolve("node_modules/jspdf-autotable/dist/jspdf.plugin.autotable.mjs"),
    },
  },
  build: {
    rollupOptions: {
      // extras opcionais do jsPDF (HTML/SVG dentro do PDF) que o Ritmo não usa:
      // ficam de fora do app
      external: ["html2canvas", "dompurify", "canvg"],
    },
  },
}));
