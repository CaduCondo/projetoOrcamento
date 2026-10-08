/* Regras da senha forte (criar conta e trocar senha). Esta lista é a ÚNICA fonte: a tela desenha a partir dela
   e a validação também — assim o que aparece em verde é exatamente o que o sistema exige.
   Cada regra recebe (senha, confirmação) e devolve verdadeiro/falso. */
const PASSWORD_RULES=[
  {id:'len',    texto:'No mínimo 6 caracteres',                   erro:'A nova senha precisa ter ao menos 6 caracteres.',            ok:(p)=>[...p].length>=6},
  {id:'upper',  texto:'Deve ter no mínimo uma letra maiúscula',   erro:'A nova senha precisa ter ao menos uma letra maiúscula.',     ok:(p)=>/\p{Lu}/u.test(p)},
  {id:'lower',  texto:'Deve ter no mínimo 1 letra minúscula',     erro:'A nova senha precisa ter ao menos 1 letra minúscula.',       ok:(p)=>/\p{Ll}/u.test(p)},
  {id:'digits', texto:'Deve ter no mínimo 2 números',             erro:'A nova senha precisa ter ao menos 2 números.',               ok:(p)=>(p.match(/\p{Nd}/gu)||[]).length>=2},
  {id:'special',texto:'Deve ter no mínimo 1 caractere especial',  erro:'A nova senha precisa ter ao menos 1 caractere especial (como ! @ # $ % &).',ok:(p)=>/[^\p{L}\p{N}\s]/u.test(p)},
  {id:'same',   texto:'As senhas devem ser idênticas',            erro:'As senhas não conferem.',                                    ok:(p,c)=>p!==''&&p===c},
];
/* situação de cada regra para a senha digitada e a repetição */
const passwordChecks=(p,c)=>PASSWORD_RULES.map(r=>({id:r.id,texto:r.texto,erro:r.erro,ok:!!r.ok(p||'',c||'')}));
const passwordOk=(p,c)=>passwordChecks(p,c).every(r=>r.ok);
/* mensagem da primeira regra que falta (ou null se está tudo certo) */
const passwordProblem=(p,c)=>passwordChecks(p,c).find(r=>!r.ok)?.erro||null;
