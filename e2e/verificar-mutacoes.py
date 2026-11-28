"""Prova de que os testes E2E não dão falso positivo: estraga o app DE PROPÓSITO (um defeito de cada vez) e confere que o cenário
correspondente REPROVA. Se algum cenário continuar passando com o app estragado, o teste está fraco e precisa ser corrigido.
Uso (na pasta do projeto, depois de `npm run e2e` ter passado):  python e2e/verificar-mutacoes.py
Não faz parte do GitHub Actions (demora); rode de vez em quando e quando criar cenários novos. O arquivo estragado é sempre restaurado."""
import subprocess, sys, pathlib, shlex

RAIZ = pathlib.Path(__file__).resolve().parent.parent
SHELL = sys.platform == 'win32'

# (arquivo, trecho original, trecho estragado, parte do nome do cenário que TEM que reprovar)
MUTACOES = [
    ('src/js/52-dialog-cell.js', 'if(!await confirmAsync(`Apagar ', 'if(false&&!await confirmAsync(`Apagar ', 'Apagar um item pede confirmação'),
    ('src/js/29-model-carteira.js', 'c.valor=Math.round((c.valor+delta)*100)/100', 'c.valor=Math.round((c.valor-delta)*100)/100', 'Carteira'),
    ('src/js/50-view-month.js', "sobra=MT('receber',y,m,'prev')-MT('pagar',y,m,'prev')", "sobra=MT('receber',y,m,'prev')-MT('pagar',y,m,'prev')+acum(y,m,'prev')", 'resumo do mês calcula'),
    ('src/js/24-model-schedule.js', "if(nome===c.nome&&scope==='manter')", 'if(false)', 'Mudar só o dia'),
    ('src/js/29-model-rules.js', 'function autoFor(desc,tipo){const d=autoTxt(desc);', 'function autoFor(desc,tipo){return null;const d=autoTxt(desc);', 'automação criada'),
    ('src/js/30-storage.js', 'const save=()=>{if(readOnly)return;backend.save()};', 'const save=()=>{};', 'continua lá depois de recarregar'),
    ('src/js/29-model-parcelas.js', 'fim:c.i+(c.t-c.n)', 'fim:c.i+(c.t-c.n)-1', 'parcelada'),
    ('src/css/theme.css', 'table-layout:fixed', 'table-layout:auto', 'valor aparece inteiro'),
    ('src/js/62-ui-categories-panel.js', 'atuais=catsAtuais()', 'atuais=S.cats', 'Renomear uma categoria'),
    ('src/js/28-model-import.js', 'function chavesImportadas(){const s=new Set();', 'function chavesImportadas(){const s=new Set();return s;', 'não duplica nada'),
    ('src/js/68-view-ledger.js', 'const TAG_RE=/#[\\p{L}\\d_]+/gu;', 'const TAG_RE=/#NUNCA_CASA/gu;', 'Tags com #'),
    ('src/js/29-model-recorrentes.js', 'if(ms.length<3)return null;', 'if(ms.length<1)return null;', 'assinatura'),
    ('src/js/29-model-recorrentes.js', 'if(max>min*1.3)return null;', 'if(false)return null;', 'assinatura'),
    ('src/css/theme.css', '.cr,.cr.hd{grid-template-columns:30px minmax(140px,1fr) 56px 210px 120px 80px;', '.cr{grid-template-columns:30px minmax(140px,1fr) 64px 180px 120px 70px 66px 78px 42px;', 'ficam alinhados'),
    ('src/js/22-model-categories.js', 'if(novos.length){ens(dstId,y,m)', 'if(novos.length){ens(dstId,y,0)', 'Virar lançamento'),
    ('src/js/22-model-categories.js', 'S.cats=S.cats.filter(c=>!vs.some(v=>v.id===c.id));', '', 'Virar lançamento'),
    ('src/js/63-ui-category-dialog.js', '<details class="f cfvd">', '<details class="f cfvd" open>', 'à vista'),
    ('src/js/22-model-categories.js', 'for(const v of versoesDe(id))v.nome=limpo.nome;', 'c.nome=limpo.nome;', 'valer em todos os meses'),
    ('src/js/52-dialog-cell.js', "if(antes){escopo=await askChoice(", "if(false){escopo=await askChoice(", 'todos os meses'),
    ('src/js/52-dialog-cell.js', 'cur.cid=renomearCategoria(cid,nome,escopo,y,m).id', 'cur.cid=cid', 'dos lançamentos do mês'),
    ('src/js/46-ui-dialogs.js', "if(dlg4.open)return;", "", 'outra categoria já usa'),
    ('src/js/21-model-calc.js', 'const lastActive=y=>{', 'const lastActive0=y=>{', 'perguntas rápidas'),
    ('src/css/theme.css', '.right .btn.sm{min-height:40px;', '.right .btn.sm{min-height:30px;', 'botões são fáceis de tocar'),
    ('src/css/theme.css', '  table.mes{table-layout:fixed}\n', '  table.mes{table-layout:fixed}\n  main{min-width:600px}\n', 'cabe na largura de um celular'),
    ('src/js/70-events.js', 'l.hidden=!abrir;', 'l.hidden=false;', 'O menu fecha com Esc'),
    ('src/js/70-events.js', "if(e.key==='Escape')fecharMenuUsuario(true)", 'if(false)fecharMenuUsuario(true)', 'O menu fecha com Esc'),
    ('src/js/70-events.js', "if(!e.target.closest('.umenu'))fecharMenuUsuario(false)", 'if(false)fecharMenuUsuario(false)', 'O menu fecha com Esc'),
    ('src/js/70-events.js', 'if(item)fecharMenuUsuario(false);', '', 'Escolher Ajuda desta tela'),
    ('src/css/styles.css', 'width:100%;min-height:44px;padding:8px 12px', 'width:100%;min-height:0;padding:0 12px', 'opções fáceis de tocar'),
    ('src/css/theme.css', '.userchip .uname{max-width:88px}', '.userchip .uname{max-width:600px}', 'topo cabe numa linha'),
    ('src/js/10-format.js', "replace(/[&<>\"]/g", "replace(/[&\"]/g", 'digitado no nome da categoria'),
    ('src/js/66-ui-import.js', ',isEvalSupported:false});', '});', 'leitor de PDF abre o arquivo sem executar código'),
    # ---- E2E da NUVEM (emuladores do Firebase). Mexem também em firestore.rules: o emulador lê as regras ao subir. ----
    ('src/js/34-firestore-store.js', 'await batch.commit();this.snap=cur;return n}', 'this.snap=cur;return n}', 'nuvem:Criar conta, lançar'),
    ('firestore.rules', 'allow read: if isOwner(uid) || isAdmin();', 'allow read: if true;', 'nuvem:Uma pessoa não lê nem altera'),
    ('firestore.rules', 'allow write: if false;', 'allow write: if true;', 'nuvem:Uma pessoa não lê nem altera'),
    ('firestore.rules', ".matches('^(data:image/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2})?$')", '.size() >= 0', 'nuvem:O banco recusa um cadastro cuja foto'),
    ('src/js/67-ui-bank.js', 'await d.set({json:JSON.stringify({url:u})})', 'void 0', 'nuvem:Informei o endereço no computador'),
    ('src/js/65-ui-admin.js', '[data-mv],[data-lf],[data-ltag],#lq,', '', 'nuvem:O administrador vê os dados'),
]

def rodar_lista(args):
    return subprocess.run(args, cwd=RAIZ, shell=False, capture_output=True, text=True, encoding='utf-8', errors='replace')


def rodar(cmd):
    return subprocess.run(cmd if SHELL else shlex.split(cmd), cwd=RAIZ, shell=SHELL, capture_output=True, text=True, encoding='utf-8', errors='replace')


def main():
    filtro = sys.argv[1] if len(sys.argv) > 1 else ''
    resultado = []
    for arq, velho, novo, cenario in MUTACOES:
        if filtro and filtro not in cenario:
            continue
        caminho = RAIZ / arq
        original = caminho.read_text(encoding='utf-8')
        if velho not in original:
            resultado.append((cenario, arq, 'TRECHO NÃO ENCONTRADO (atualize a mutação)'))
            continue
        try:
            caminho.write_text(original.replace(velho, novo), encoding='utf-8', newline='')
            nuvem = cenario.startswith('nuvem:')
            b = rodar('python build.py --env local --out dist/e2e/index.html')
            if b.returncode:
                resultado.append((cenario, arq, 'O app estragado nem compila (ok, mas troque a mutação)'))
                continue
            if nuvem:      # sobe os emuladores, monta o site em modo emu e roda só o cenário filtrado
                interno = f'python build.py --env emu --out dist/e2e-nuvem/index.html && npx bddgen -c playwright.nuvem.config.js && npx playwright test -c playwright.nuvem.config.js -g "{cenario[6:]}"'
                t = rodar_lista(['npx', 'firebase', 'emulators:exec', '--only', 'auth,firestore', '--project', 'demo-orcamento', interno])
            else:
                t = rodar(f'npx playwright test -g "{cenario}" --workers=3')
            resultado.append((cenario, arq, 'OK: o teste reprovou' if t.returncode else 'PERIGO: o teste PASSOU com o app estragado'))
        finally:
            caminho.write_text(original, encoding='utf-8', newline='')
    rodar('python build.py --env local --out dist/e2e/index.html')
    print()
    for cenario, arq, r in resultado:
        print(f'{r:55} | {cenario} ({arq})')
    sys.exit(1 if any(r.startswith(('PERIGO', 'TRECHO')) for _, _, r in resultado) else 0)


main()
