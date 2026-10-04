"""Gera o index.html (arquivo único, sem nenhum dado pessoal) a partir de src/."""
t = open('src/template.html', encoding='utf-8').read()
t = t.replace('/*CHARTJS*/', open('src/chart.js', encoding='utf-8').read().replace('</script>', '<\/script>'))
t = t.replace('/*SEED*/null', 'null')
open('index.html', 'w', encoding='utf-8').write(t)
print('index.html gerado', len(t), 'bytes')
